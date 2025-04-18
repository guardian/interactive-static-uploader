# Guardian visuals static uploader
Upload static assets to S3.

A zip file can be uploaded and the contents of which will be served from a
new folder on S3.

## Setup
You'll need `nodejs` and `npm`.

To run locally:
```bash
npm install
npm run dev

```
This will serve the app locally at http://0.0.0.0:4004/

As this will be running as a service it's advised to use process manager 
such as [forever](https://github.com/foreverjs/forever) or 
[pm2](https://github.com/Unitech/pm2)

## Deployment
This app is deployed manually to an EC2 instance in our `interactives` account. The Interactives team can share the location of the instance with you.

In order to deploy a new version, first merge your changes to the `master` branch in GitHub.

Next, ssh onto the EC2 instance and run:

```bash
cd interactive-static-uploader
git pull
sudo supervisorctl restart staticuploader
```

In order to ssh onto the instance, someone with pre-existing access will need to add your ssh key to the instance. You'll also need to be working on an IP permitted by the security group (the office is permitted, for example).

## Todo
- [ ] Reduce code clutter
- [ ] Set sensible file size limits
- [ ] Black-list files and folders eg. .DS_Store
- [ ] Report progress to user while uploading
- [ ] Write docs
- [ ] Browser test 
- [ ] Simple deploy system for fixes
- [ ] Fix fonts

## Done
- [x] Security: Added Google Auth
- [x] Security: Restrict to Guardian IP
- [x] Output list of uploaded interactives
- [x] Check for index.html
- [x] Pick a sensible upload folder to prevent clashes
- [x] Check for index.html
- [x] Style up frontend
- [x] Warn about no index.html in zip root
- [x] Add navigation. Upload another etc.
- [x] Use zip file name as default project name
- [x] Better success param passing
- [x] Only show success after finishing s3 sync
- [x] Success screen with embed code and preview (iframe)
- [x] Restrict uploads to .zip extentions
- [x] Drag & drag upload
