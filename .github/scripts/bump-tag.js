function bumpVersion(version, level) {
  let [major, minor, patch] = version.split('.').map(Number);
  if (level === 'major') {
    major++;
    minor = 0;
    patch = 0;
  } else if (level === 'minor') {
    minor++;
    patch = 0;
  } else {
    patch++;
  }
  return `${major}.${minor}.${patch}`;
}

export async function bumpTag({ github, context, service, env, updateLevel, format }) {
  let prefix;
  if (format === 'env-service') {
    prefix = `${env}-${service}`;
  } else {
    prefix = `${service}-${env}`;
  }

  console.log(`Config: Service=${service}, Env=${env}, Format=${format || 'service-env'}`);
  console.log(`Searching tags with prefix: ${prefix}`);
 
  const { data: tags } = await github.rest.repos.listTags({
    owner: context.repo.owner,
    repo: context.repo.repo,
    per_page: 100,
  });
 
  const filtered = tags
    .map(t => t.name)
    .filter(name => name.startsWith(prefix))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const latestTag = filtered.length > 0 ? filtered[0] : null;
  let newVersion;

  if (latestTag) {
    const parts = latestTag.split('-');
    const version = parts[parts.length - 1]; 
    newVersion = bumpVersion(version, updateLevel);
  } else {
    newVersion = '1.0.0';
  }

  const newTag = `${prefix}-${newVersion}`;
  
  console.log(`Latest tag found: ${latestTag || 'None'}`);
  console.log(`New tag to create: ${newTag}`);

  try {
    await github.rest.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `refs/tags/${newTag}`,
      sha: context.sha,
    });
  } catch (error) {
    console.error(`Error creating tag ${newTag}:`, error.message);
    throw error;
  }

  return { latestTag, newTag };
}