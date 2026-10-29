import { LdError, ldRequest, readError } from './api.js';
import { createFlagBody, planSync } from './flags.js';

const SEMANTIC_PATCH = 'application/json; domain-model=launchdarkly.semanticpatch';

async function mutate(path, options) {
  const response = await ldRequest(path, options);
  if (!response.ok) throw new LdError(await readError(response), response.status);
  return response;
}

export function summarizeResults(results) {
  const line = `Created ${results.created.length}, updated ${results.updated.length}, deleted ${results.deleted.length}, skipped ${results.skipped.length}, failed ${results.failed.length}.`;
  const details = [];
  for (const item of results.skipped) {
    if (item.reason) details.push(`${item.name || item.key}: ${item.reason}`);
  }
  for (const item of results.failed) {
    if (item.message) details.push(`${item.name || item.key}: ${item.message}`);
  }
  const quiet =
    results.created.length +
      results.updated.length +
      results.deleted.length +
      results.skipped.length +
      results.failed.length ===
    0;
  return { line: quiet ? `${line} Everything already matches.` : line, details };
}

export async function executeSync({
  divs,
  flags,
  customerName,
  environmentKey,
  projectKey,
  apiKey,
  deleteConfirmed = false,
  confirmedDeleteKeys = [],
  fetchImpl,
  sleep
}) {
  const plan = planSync({ divs, flags, customerName, environmentKey });
  const confirmed = new Set(confirmedDeleteKeys);
  const request = { apiKey, fetchImpl, sleep };
  const results = {
    created: [],
    updated: [],
    deleted: [],
    skipped: [...plan.skips],
    failed: [...plan.failures]
  };
  for (const div of divs) {
    if (!plan.rowErrors[div.id]) continue;
    results.failed.push({ key: div.name || div.id, divId: div.id, message: plan.rowErrors[div.id] });
  }

  for (const item of plan.creates) {
    try {
      await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}`, {
        ...request,
        method: 'POST',
        body: createFlagBody(customerName, item.div)
      });
      results.created.push({ key: item.identity.key, name: item.identity.name, divId: item.div.id });
    } catch (error) {
      results.failed.push({
        key: item.identity.key,
        name: item.identity.name,
        divId: item.div.id,
        message: error.message || 'Could not create the flag.'
      });
    }
  }

  for (const item of plan.updates) {
    let changed = false;
    if (item.variationId) {
      try {
        await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(item.identity.key)}`, {
          ...request,
          method: 'PATCH',
          headers: { 'Content-Type': SEMANTIC_PATCH },
          body: {
            environmentKey,
            comment: 'DarkLaunching updated the off variation',
            instructions: [{ kind: 'updateOffVariation', variationId: item.variationId }]
          }
        });
        changed = true;
      } catch (error) {
        results.failed.push({
          key: item.identity.key,
          name: item.identity.name,
          divId: item.div.id,
          message: error.message || 'Could not update the flag.'
        });
      }
    }
    if (item.addTag) {
      const instructions = [{ kind: 'addTags', values: [item.addTag] }];
      if (item.removeTags?.length) instructions.push({ kind: 'removeTags', values: item.removeTags });
      try {
        await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(item.identity.key)}`, {
          ...request,
          method: 'PATCH',
          headers: { 'Content-Type': SEMANTIC_PATCH },
          body: {
            environmentKey,
            comment: 'DarkLaunching updated the customer tag',
            instructions
          }
        });
        changed = true;
      } catch (error) {
        results.failed.push({
          key: item.identity.key,
          name: item.identity.name,
          divId: item.div.id,
          message: error.message || 'Could not update the flag tag.'
        });
      }
    }
    if (typeof item.description === 'string') {
      try {
        await mutate(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(item.identity.key)}`, {
          ...request,
          method: 'PATCH',
          headers: { 'Content-Type': SEMANTIC_PATCH },
          body: {
            comment: 'DarkLaunching saved the CSS selector',
            instructions: [{ kind: 'updateDescription', value: item.description }]
          }
        });
        changed = true;
      } catch (error) {
        results.failed.push({
          key: item.identity.key,
          name: item.identity.name,
          divId: item.div.id,
          message: error.message || 'Could not save the CSS selector.'
        });
      }
    }
    if (changed) results.updated.push({ key: item.identity.key, name: item.identity.name, divId: item.div.id });
  }

  for (const flag of plan.prunes) {
    if (!deleteConfirmed || !confirmed.has(flag.key)) {
      results.skipped.push({
        key: flag.key,
        name: flag.name,
        reason: deleteConfirmed ? 'Not confirmed' : 'Deletion cancelled'
      });
      continue;
    }
    try {
      const response = await ldRequest(`/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flag.key)}`, {
        ...request,
        method: 'DELETE'
      });
      if (!response.ok && response.status !== 404) {
        results.failed.push({ key: flag.key, name: flag.name, message: await readError(response) });
        continue;
      }
      results.deleted.push({ key: flag.key, name: flag.name });
    } catch (error) {
      results.failed.push({ key: flag.key, name: flag.name, message: error.message || 'Could not delete the flag.' });
    }
  }

  return { plan, results };
}
