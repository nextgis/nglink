import { toggleBlock } from '../utils/dom';

import { showMap } from './map';

import type { ApiError } from '../interfaces';
import type { GeoJSON } from 'geojson';

export const dataInput = document.getElementById(
  'data-input',
) as HTMLInputElement;
export const showDataBtn = document.getElementById(
  'show-data-btn',
) as HTMLButtonElement;
export const appBlock = document.getElementById('app') as HTMLElement;
export const inputBlock = document.getElementById('input-block') as HTMLElement;

const loadingBlock = document.getElementById('loading-block') as HTMLElement;

const errorBlock = document.getElementById('error-block') as HTMLElement;
const errorBlockDetail = document.getElementById(
  'error-block-detail',
) as HTMLElement;
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropArea = document.getElementById('drop-area') as HTMLElement;

export function showLoading() {
  toggleBlock(inputBlock, false);
  toggleBlock(appBlock, true);
  toggleBlock(loadingBlock, true);
}

export function hideLoading() {
  toggleBlock(loadingBlock, false);
}
export function showError(er: ApiError) {
  errorBlockDetail.innerHTML = er.error || '';
  toggleBlock(errorBlock, true);
}
function hideError() {
  errorBlockDetail.innerHTML = '';
  toggleBlock(errorBlock, false);
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) =>
  dropArea.addEventListener(eventName, preventDefaults, false),
);
['dragenter', 'dragover'].forEach((eventName) =>
  dropArea.addEventListener(eventName, () => highlight(dropArea), false),
);
['dragleave', 'drop'].forEach((eventName) =>
  dropArea.addEventListener(eventName, () => unhighlight(dropArea), false),
);
dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', onFileChange, false);

function handleFile(file: File) {
  const reader = new FileReader();
  showLoading();
  reader.onload = (event) => {
    const result = event.target?.result;
    if (result && typeof result === 'string') {
      try {
        const geojson = JSON.parse(result) as GeoJSON;
        showMap(geojson);
      } catch {
        showError({ error: 'File is not valid GeoJSON' });
      }
    }
    hideLoading();
  };
  reader.onerror = () => {
    hideLoading();
    showError({ error: 'Read file error' });
  };
  reader.readAsText(file);
}

function handleDrop(e: DragEvent) {
  hideError();
  const dt = e.dataTransfer;
  if (dt && dt.files.length) {
    handleFile(dt.files[0]);
  }
}
function onFileChange(e: Event) {
  hideError();
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length) {
    handleFile(files[0]);
  }
}

function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}
function highlight(el: HTMLElement) {
  el.classList.add('highlight');
}
function unhighlight(el: HTMLElement) {
  el.classList.remove('highlight');
}
