# NextGIS Link

Display GeoJSON from URL Parameters

## Installation

### Clone the Repository

```bash
git clone https://github.com/nextgis/nglink.git
cd nglink
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Frontend Setup

```bash
cd ./front
npm i
npm run prod
# or for development
npm run watch
```

## Usage

### URL Parameters

Configure the map display by appending parameters to your application URL:

- `u`: URL of the GeoJSON data.
- `color`: Fill color for the GeoJSON layer (default: `blue`).
- `bbox`: Bounding box in `minLng,minLat,maxLng,maxLat` format.
- `qmsid`: QMS ID for specific map services.
- `fitoffset`: Offset for fitting the layer, format `width,height` or single `size`.
- `fitpadding`: Padding in pixels around the fitted layer.
- `fitmaxzoom`: Maximum zoom level when fitting the layer.

**Example URL:**

```txt
https://show.nextgis.com/?u=https://data.nextgis.com/order/d6edd701/geometry&color=red&padding=50&fitpadding=10
```

#### GET `/img`

Generates a PNG image of the map with the specified parameters.

- **Parameters:**
  - `u`: URL of the GeoJSON data.
  - `color`: Fill color for the GeoJSON layer (default: `blue`).
  - `bbox`: Bounding box in `minLng,minLat,maxLng,maxLat` format.
  - `qmsid`: QMS ID for specific map services.
  - `fitoffset`: Offset for fitting the layer, format `width,height` or single `size`.
  - `fitpadding`: Padding in pixels around the fitted layer.
  - `fitmaxzoom`: Maximum zoom level when fitting the layer.
  - `width`: Image width in pixels (default: `400`).
  - `height`: Image height in pixels (default: `200`).

**Example:**

```txt
GET /img?u=https://data.nextgis.com/order/d6edd701/geometry&color=green&width=800&height=600
```

**Response:**

- Returns a PNG image of the map.

**Save Image Example:**

```bash
curl "http://your-app-domain.com/img?u=https://data.nextgis.com/order/d6edd701/geometry&color=green&width=800&height=600" --output map.png
```

## Environment Variables

Ensure the following environment variables are set for backend functionality:

- `NGW_URL`: Base URL for NextGIS Web service.
- `NGW_LOGIN`: NextGIS Web service login.
- `NGW_PASSWORD`: NextGIS Web service password.
- `NGW_UPLOAD_GROUP`: ID of the group for vector uploads.

## Docker

### Build Docker Image

```bash
docker build -t harbor.nextgis.net/frontend/nglink:latest .
```

### Run Docker Container

```bash
docker run -it -p 3000:3000 --rm --name nglink harbor.nextgis.net/frontend/nglink:latest
```
