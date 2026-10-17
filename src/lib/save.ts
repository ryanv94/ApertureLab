import { downloadBlob, downloadZip } from './download';

export type SaveFile = { name: string; blob: Blob };

/** Phones and tablets: no hover, finger input. Downloads there land in Files, not the photo library. */
export function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/**
 * Hands finished images to the visitor. On desktop: a download (a ZIP when there are several).
 * On touch devices: a sheet showing the full-resolution images, which can be pressed and held to save
 * to Photos / the gallery, with a Share button (the share sheet's "Save Image" also goes to Photos).
 */
export async function saveImages(files: SaveFile[], zipName = 'images.zip'): Promise<void> {
  if (!files.length) return;
  if (!isTouchDevice()) {
    if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
    else await downloadZip(files, zipName);
    return;
  }
  openSaveSheet(files, zipName);
}

/** Relabels a "Download all (.zip)" button on touch devices, where the images are saved individually instead. */
export function touchLabel(btn: HTMLElement, label: string): void {
  if (isTouchDevice()) btn.textContent = label;
}

function openSaveSheet(files: SaveFile[], zipName: string): void {
  const many = files.length > 1;
  const shareFiles = files.map((f) => new File([f.blob], f.name, { type: f.blob.type }));
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: shareFiles });
  const urls = files.map((f) => URL.createObjectURL(f.blob));

  const dialog = document.createElement('dialog');
  dialog.className = 'modal save-dialog';
  dialog.setAttribute('aria-labelledby', 'save-dialog-title');
  dialog.innerHTML = `
    <div class="modal-head"><h2 id="save-dialog-title">${many ? `Save ${files.length} images` : 'Save image'}</h2><button type="button" class="modal-close" data-act="close" aria-label="Close">✕</button></div>
    <div class="modal-body">
      <p class="hint">Press and hold ${many ? 'an image' : 'the image'}, then choose <strong>Save to Photos</strong> (iPhone) or <strong>Download image</strong> (Android).${canShare ? ` Or use Share and pick <strong>Save ${many ? 'Images' : 'Image'}</strong>.` : ''}</p>
      <div class="error-box" role="alert" hidden><span class="msg"></span></div>
      <ul class="save-list"></ul>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-ghost" data-act="download">${many ? 'Download files (.zip)' : 'Download file'}</button>
      <div class="grp">
        ${canShare ? `<button type="button" class="btn btn-primary" data-act="share">Share${many ? ' all' : ''}</button>` : ''}
        <button type="button" class="btn${canShare ? '' : ' btn-primary'}" data-act="close">Done</button>
      </div>
    </div>`;
  const list = dialog.querySelector('.save-list')!;
  files.forEach((f, i) => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = urls[i];
    img.alt = f.name;
    const cap = document.createElement('span');
    cap.className = 'save-name';
    cap.textContent = f.name;
    li.append(img, cap);
    list.append(li);
  });

  const err = dialog.querySelector<HTMLElement>('.error-box')!;
  const fail = (message: string) => { err.querySelector('.msg')!.textContent = message; err.hidden = false; };
  const close = () => {
    dialog.close();
    dialog.remove();
    urls.forEach((u) => URL.revokeObjectURL(u));
  };

  dialog.addEventListener('click', async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'close') close();
    else if (act === 'share') {
      err.hidden = true;
      try {
        await navigator.share({ files: shareFiles });
      } catch (e2) {
        if ((e2 as Error).name !== 'AbortError') fail('Sharing failed — press and hold the image to save it instead.');
      }
    } else if (act === 'download') {
      err.hidden = true;
      try {
        if (many) await downloadZip(files, zipName);
        else downloadBlob(files[0].blob, files[0].name);
      } catch (e2) {
        fail((e2 as Error).message);
      }
    }
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dialog);
  dialog.showModal();
}
