const fs = require('fs');
const path = require('path');

// Get the tag from the environment variable GitHub Actions provides
const tag = process.env.GITHUB_REF_NAME;
if (!tag) {
  console.error("Error: GITHUB_REF_NAME environment variable not set.");
  process.exit(1);
}

// The version is the tag name without the 'v' prefix
const version = tag.substring(1);

// Path to the manifest file
const manifestPath = path.resolve(__dirname, '../../frontend/manifest.json');

// Read, update, and write the manifest file
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Successfully updated ${manifestPath} to version ${version}`);
} catch (error) {
  console.error(`Error updating manifest file: ${error.message}`);
  process.exit(1);
}