# Guardian visuals static uploader
Upload static assets to S3.

A zip file can be uploaded and the contents of which will be servered from a
new folder on S3.

## Setup
You'll need `nodejs` and `npm`.

```bash
nmp install
node s3-upload-server.js

```

As this will be running as a service it's advised to use process manager 
such as [forever](https://github.com/foreverjs/forever) or 
[pm2](https://github.com/Unitech/pm2)


## Todo
- [ ] Security: Added Google Auth
- [ ] Set sensible file size limits
- [ ] Security: Restrict to Guardian IP
- [ ] Black-list files and folders eg. .DS_Store
- [ ] Browser test 
- [ ] Report progress to user while uploading
- [ ] Write docs
- [ ] Simple deploy system for fixes

## Done
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
