export function environmentItems(environments) {
  if (Array.isArray(environments)) return environments;
  if (environments && Array.isArray(environments.items)) return environments.items;
  return [];
}

export function normalizeProjectPayload(project) {
  return {
    key: String(project?.key ?? ''),
    name: String(project?.name || project?.key || ''),
    environments: environmentItems(project?.environments)
      .map((env) => ({
        key: String(env?.key ?? ''),
        name: String(env?.name || env?.key || ''),
        clientSideId: String(env?._id ?? '')
      }))
      .filter((env) => env.key)
  };
}

export function filterProjects(projects, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle || !Array.isArray(projects)) return Array.isArray(projects) ? projects : [];
  return projects.filter((project) => {
    const name = String(project?.name ?? '').toLowerCase();
    const key = String(project?.key ?? '').toLowerCase();
    return name.includes(needle) || key.includes(needle);
  });
}

export function findEnvironmentByClientId(projects, clientId) {
  const needle = String(clientId ?? '').trim();
  if (!needle || !Array.isArray(projects)) return null;
  for (const project of projects) {
    const environment = (project?.environments || []).find((item) => item?.clientSideId === needle);
    if (environment) return { project, environment };
  }
  return null;
}

export function clientEnvironmentReady({ connected, projects, clientSideId, projectKey, environmentKey }) {
  if (!connected) return false;
  const match = findEnvironmentByClientId(projects, clientSideId);
  if (!match?.project?.key || !match?.environment?.key) return false;
  return match.project.key === projectKey && match.environment.key === environmentKey;
}

export function selectProjectEnvironment(projects, preferredProjectKey, preferredEnvironmentKey) {
  const notices = [];
  if (!projects.length) {
    return { project: null, environment: null, notices: ['This account has no projects.'] };
  }

  let project = projects.find((item) => item.key === preferredProjectKey);
  if (preferredProjectKey && !project) {
    project = projects[0];
    notices.push(`Saved project "${preferredProjectKey}" was not found. Selected "${project.name}" instead.`);
  } else if (!project) {
    project = projects[0];
  }

  const environments = project.environments || [];
  if (!environments.length) {
    notices.push(`Project "${project.name}" has no environments.`);
    return { project, environment: null, notices };
  }

  let environment = environments.find((item) => item.key === preferredEnvironmentKey);
  if (preferredEnvironmentKey && !environment) {
    environment = environments[0];
    notices.push(`Saved environment "${preferredEnvironmentKey}" was not found. Selected "${environment.name}" instead.`);
  } else if (!environment) {
    environment = environments[0];
  }

  return { project, environment, notices };
}
