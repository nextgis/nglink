import { showInput, urlRuntime } from './common';
import {
  dataInput,
  hideLoading,
  showDataBtn,
  showError,
  showLoading,
} from './pages/home';
import { showMap } from './pages/map';
import { state } from './state';

for (const [key, s] of Object.entries(state.state)) {
  if (s.urlName) {
    const val = urlRuntime.get(s.urlName);
    if (val) {
      state.set(key as any, s.parseStr(val));
    }
  }
}

state.subscribe((values) => {
  for (const item of Object.values(values)) {
    if (item.urlRuntime && item.urlName) {
      urlRuntime.set(item.urlName, item.value);
    }
  }
});

const url = state.getVal('url');

if (url) {
  fetchData(url);
} else {
  showInput();
  showDataBtn.addEventListener('click', () => {
    const val = dataInput.value;
    if (val) {
      fetchData(val);
    }
  });
}

// test url https://data.nextgis.com/order/d6edd701/geometry
async function fetchData(url: string) {
  showLoading();
  try {
    const response = await fetch('/d?u=' + encodeURIComponent(url));
    const data = await response.json();
    if (response.ok) {
      hideLoading();
      if (data.geojson) {
        showMap(data.geojson, url, data.link);
      } else {
        throw new Error('No GeoJSON data');
      }
    } else {
      showInput();
      showError(data);
    }
  } catch (error) {
    showInput();
    showError({ error: 'Unable to fetch data' });
  }
}
