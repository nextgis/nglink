# NextGIS Link

Show geojson from url param

## Installation

```bash
npm i
# for development
npm run dev-server
```

### Front

```bash
cd ./front
npm i
npm run prod
# or for development
npm run watch
```

## Docker

docker build -t nglink:latest .

docker run -it -p 3000:3000 --rm --name nglink nglink:latest
