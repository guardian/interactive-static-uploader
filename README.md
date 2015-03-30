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

## Todo
- [x] Only show success after finishing s3 sync
- [x] Drag & drag upload
- [ ] Report progress to user while uploading
- [ ] Style up frontend
- [x] Success screen with embed code and preview (iframe)
- [ ] Check for index.html
- [x] Restrict uploads to .zip extentions
- [ ] Black-list files eg. .DS_Store
- [ ] Security: Restrict to Guardian IP
- [ ] Security: Added Google Auth
- [ ] Simple deploy system for fixes
- [ ] Pick a sensible upload folder to prevent clashes
- [ ] Browser test 
- [ ] Write docs
