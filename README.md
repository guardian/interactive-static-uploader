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
- [ ] Warn about no index.html in zip root
- [ ] Add navigation. Upload another etc.
- [ ] Style up frontend
- [ ] Pick a sensible upload folder to prevent clashes
- [ ] Set sensible file size limits
- [ ] Report progress to user while uploading
- [ ] Check for index.html
- [ ] Security: Restrict to Guardian IP
- [ ] Black-list files and folders eg. .DS_Store
- [ ] Security: Added Google Auth
- [ ] Simple deploy system for fixes
- [ ] Check for index.html
- [ ] Browser test 
- [ ] Write docs
- [x] Use zip file name as default project name
- [x] Better success param passing
- [x] Only show success after finishing s3 sync
- [x] Success screen with embed code and preview (iframe)
- [x] Restrict uploads to .zip extentions
- [x] Drag & drag upload
