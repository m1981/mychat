Upload your source maps using Sentry CLI.
In this guide, you'll learn how to successfully upload source maps using our sentry-cli tool.

This guide assumes the following:

sentry-cli version >= 2.17.0
Sentry JavaScript SDK version >= 7.47.0
Automatic Setup
The easiest way to configure source map uploading using the Sentry CLI is with Sentry's Wizard:

Bash

Copied
npx @sentry/wizard@latest -i sourcemaps
The wizard will guide you through the following steps:

Logging into Sentry and selecting a project
Installing the necessary Sentry packages
Configuring your build tool to generate and upload source maps
Configuring your CI to upload source maps
If you want to configure source map uploading using the CLI, follow the steps below.

Manual Setup
1. Generate Source Maps
   You can generate source maps using the tooling of your choice. See examples from other guides linked under Uploading Source Maps.

2. Configure Sentry CLI
   You can find installation instructions for Sentry CLI here: https://docs.sentry.io/cli/installation/

For more info on sentry-cli configuration visit the Sentry CLI configuration docs.

Make sure sentry-cli is configured for your project. For that you can use environment variables:

You can manually create an Auth Token or create a token directly from this page. A created token will only be visible once right after creation - make sure to copy-paste it immediately and DO NOT commit it! We recommend adding it as an environment variable.
Bash
.env.local

Copied
SENTRY_ORG=pixelcrate
SENTRY_PROJECT=chatai
SENTRY_AUTH_TOKEN=Click to generate token (DO NOT commit)
3. Inject Debug IDs Into Artifacts
   Debug IDs are used to match the stack frame of an event with its corresponding minified source and source map file. Visit What are Debug IDs if you want to learn more about Debug IDs.

To inject Debug IDs, use the following command:

Bash

Copied
sentry-cli sourcemaps inject /path/to/directory
Verify Debug IDs Were Injected in Artifacts
Minified source files should contain at the end a comment named debugId like:

JavaScript
example_minified_file.js

Copied
...
//# debugId=<debug_id>
//# sourceMappingURL=<sourcemap_url>
Source maps should contain a field named debug_id like:

JSON
example_source_map.js.map

Copied
{
...
"debug_id":"<debug_id>",
...
}
4. Upload Artifact Bundle
   After you've injected Debug IDs into your artifacts, upload them using the following command.

Bash

Copied
sentry-cli sourcemaps upload /path/to/directory
Verify That Artifact Bundles Were Uploaded
Open up Sentry and navigate to Project Settings > Source Maps. If you choose “Artifact Bundles” in the tabbed navigation, you'll see all the artifact bundles that have been successfully uploaded to Sentry.

5. Deploy your Application
   If you're following this guide from your local machine, then you've successfully:

Generated minified source and source map files (artifacts) by running your application's build process
Injected Debug IDs into the artifacts you've just generated
Uploaded those artifacts to Sentry with our upload command
The last step is deploying a new version of your application using the generated artifacts you created in step one. We strongly recommend that you integrate sentry-cli into your CI/CD Pipeline, to ensure each subsequent deploy will automatically inject debug IDs into each artifact and upload them directly to Sentry.

Optional Steps
Warning
Only follow these optional steps if you have concluded that you absolutely need them. Using release and dist values will make your artifact upload more specific, but will also make the entire process less forgiving, which may lead to your code not being unminified by Sentry.

Associating release with Artifact Bundle
Provide a release property in your SDK options.

JavaScript

Copied
Sentry.init({
// This value must be identical to the release name specified during upload
// with the `sentry-cli`.
release: "<release_name>",
});
Afterwards, run the sourcemaps upload command with the additional --release option. Please ensure that the value specified for <release_name> is the same value specified in your SDK options.

Bash

Copied
sentry-cli sourcemaps upload --release=<release_name> /path/to/directory
Running upload with --release doesn't automatically create a release in Sentry. Either wait until the first event with the new release set in Sentry.init is sent to Sentry, or create a release with the same name in a separate step with the CLI.

Associating dist with Artifact Bundle
In addition to release, you can also add a dist to your uploaded artifacts, to set the distribution identifier for uploaded files. To do so, run the sourcemaps upload command with the additional --dist option.

Provide release and dist properties in your SDK options.

JavaScript

Copied
Sentry.init({
// These values must be identical to the release and dist names specified during upload
// with the `sentry-cli`.
release: "<release_name>",
dist: "<dist_name>",
});
The distribution identifier is used to distinguish between multiple files of the same name within a single release. dist can be used to disambiguate build or deployment variants.

Bash

Copied
sentry-cli sourcemaps upload --release=<release_name> --dist=<dist_name> /path/to/directory
Previous
Rollup

-----------------

Upload Source Maps
For source map upload, a separate command is provided which assists you in uploading and verifying source maps:

Bash

Copied
sentry-cli sourcemaps upload /path/to/sourcemaps
This command provides several options and attempts as much auto detection as possible. By default, it will scan the provided path for files and upload them named by their path with a ~/ prefix. It will also attempt to figure out references between minified files and source maps based on the filename. So if you have a file named foo.min.js which is a minified JavaScript file and a source map named foo.min.map for example, it will send a long a Sourcemap header to associate them. This works for files the system can detect a relationship of.

By default, sentry-cli rewrites source maps before upload:

It flattens out indexed source maps. This has the advantage that it can compress source maps sometimes which might improve your processing times and can work with tools that embed local paths for source map references which would not work on the server. This is useful when working with source maps for development purposes in particular.
Local file references in source maps for source contents are inlined. This works particularly well with React Native projects which might reference thousands of files you probably do not want to upload separately.
It automatically validates source maps before upload very accurately which can spot errors you would not find otherwise until an event comes in. This is an improved version of what --validate does otherwise.
The following options exist to change the behavior of the upload command:

--dist

Sets the distribution identifier for uploaded files. This identifier is used to make a distinction between multiple files of the same name within a single release. dist can be used to disambiguate build or deployment variants. For example, dist can be the build number of an Xcode build or the version code of an Android build.

--no-sourcemap-reference

This prevents the automatic detection of source map references. It’s not recommended to use this option since the system falls back to not emitting a reference anyways. It is however useful if you are manually adding sourceMapURL comments to the minified files and you know that they are more correct than the autodetection.

--no-rewrite

Disables rewriting of matching source maps. By default, the tool will rewrite sources, so that indexed maps are flattened and missing sources are inlined if possible. This fundamentally changes the upload process to be based on source maps and minified files exclusively and comes in handy for setups like react-native that generate source maps that would otherwise not work for Sentry.

--strip-prefix / --strip-common-prefix

Unless --no-rewrite is specified, this will chop-off a prefix from all sources references inside uploaded source maps. For instance, you can use this to remove a path that is build machine specific. The common prefix version will attempt to automatically guess what the common prefix is and chop that one off automatically. This will not modify the uploaded sources paths. To do that, point the sourcemaps upload command to a more precise directory instead.

--validate

This attempts source map validation before upload when rewriting is not enabled. It will spot a variety of issues with source maps and cancel the upload if any are found. This is not the default as this can cause false positives.

--url-prefix

This sets an URL prefix in front of all files. This defaults to ~/ but you might want to set this to the full URL. This is also useful if your files are stored in a sub folder. eg: --url-prefix '~/static/js'

--ext

Overrides the list of file extensions to upload. By default, the following file extensions are processed: js, map, jsbundle and bundle. The tool will automatically detect the type of the file by the file contents (eg: sources, minified sources, and source maps) and act appropriately. For multiple extensions you need to repeat the option, e.g.: --ext js --ext map.

--ignore

Specifies one or more patterns of ignored files and folders. Overrides patterns specified in the ignore file. See --ignore-file for more information. Note that unlike --ignore-file, this argument is interpreted relative to the specified path argument.

--ignore-file

Specifies a file containing patterns of files and folders to ignore during the scan. Ignore patterns follow the gitignore rules and are evaluated relative to the location of the ignore file. The file is assumed in the current working directory or any of its parent directories.

--strict

Fail with a non-zero exit code if there are no sourcemaps to upload in the provided directory. Without this argument, the command succeeds if there are no sourcemaps to upload.

Some example usages:

Bash

Copied
# Rewrite and upload all sourcemaps in /path/to/sourcemaps
sentry-cli sourcemaps upload /path/to/sourcemaps

# Prefix all paths with ~/static/js to match where the sources are hosted online
sentry-cli sourcemaps upload /path/to/sourcemaps --url-prefix '~/static/js'

# Remove a common prefix if all source maps are located in a subdirectory
sentry-cli sourcemaps upload /path/to/sourcemaps --url-prefix '~/static/js' \
--strip-common-prefix

# Omit all files specified in .sentryignore
sentry-cli sourcemaps upload /path/to/sourcemaps --ignore-file .sentryignore

