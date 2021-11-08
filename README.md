# NextGIS Link

Show geojson from url param

## Installation

```bash
npm i
# for development
npm run dev-server
```

## Docker

docker build -t registry.nextgis.com/nglink:latest . && docker push registry.nextgis.com/nglink:latest

docker run -it -p 3000:3000 --rm --name nglink registry.nextgis.com/nglink:latest
