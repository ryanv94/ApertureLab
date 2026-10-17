/** Modal crop/rotate dialog (Cropper.js, loaded on demand). Resolves to the cropped, rotated image at full resolution, or null if cancelled. */
export async function openCropper(source: ImageBitmap, aspect: number | null, title = 'Crop photo'): Promise<ImageBitmap | null> {
  // Pages using this import 'cropperjs/dist/cropper.css' in their frontmatter (dynamic CSS isn't emitted by Astro).
  const { default: Cropper } = await import('cropperjs');
  const { guardCanvasSize } = await import('./image');

  // PNG keeps transparency (JPEG would turn it black); size is capped to what this browser can draw.
  const g = guardCanvasSize(source.width, source.height);
  const c = document.createElement('canvas');
  c.width = g.width; c.height = g.height;
  const cctx = c.getContext('2d');
  if (!cctx) throw new Error('This image is too large for your browser to crop.');
  cctx.drawImage(source, 0, 0, g.width, g.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  c.width = c.height = 0;
  if (!blob) throw new Error('This image is too large for your browser to crop.');
  const url = URL.createObjectURL(blob);

  const dialog = document.createElement('dialog');
  dialog.className = 'modal crop-dialog';
  dialog.setAttribute('aria-label', title);
  dialog.innerHTML = `
    <div class="modal-head"><h2>${title}</h2><button type="button" class="modal-close" data-act="cancel" aria-label="Cancel">✕</button></div>
    <div class="modal-body"><div class="crop-area"><img alt="Photo to crop" /></div></div>
    <div class="modal-foot">
      <div class="grp"><button type="button" class="btn" data-act="left" aria-label="Rotate left">⟲ 90°</button><button type="button" class="btn" data-act="right" aria-label="Rotate right">⟳ 90°</button></div>
      <div class="grp"><button type="button" class="btn btn-ghost" data-act="cancel">Cancel</button><button type="button" class="btn btn-primary" data-act="apply">Apply crop</button></div>
    </div>`;
  document.body.append(dialog);
  const img = dialog.querySelector('img')!;
  img.src = url;
  dialog.showModal();
  await img.decode().catch(() => null);
  const cropper = new Cropper(img, {
    aspectRatio: aspect ?? NaN, viewMode: 1, autoCropArea: 1, background: false, responsive: true, checkOrientation: false,
  });

  return new Promise((resolve, reject) => {
    let done = false;
    const finish = async (apply: boolean) => {
      if (done) return;
      done = true;
      try {
        let out: ImageBitmap | null = null;
        if (apply) {
          const canvas = cropper.getCroppedCanvas({ maxWidth: 16384, maxHeight: 16384, imageSmoothingQuality: 'high' });
          if (!canvas || !canvas.width) throw new Error('Couldn’t apply the crop — the image may be too large for this browser.');
          out = await createImageBitmap(canvas);
        }
        resolve(out);
      } catch (err) {
        reject(err);
      } finally {
        cropper.destroy();
        URL.revokeObjectURL(url);
        dialog.close();
        dialog.remove();
      }
    };
    dialog.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'left') cropper.rotate(-90);
      else if (act === 'right') cropper.rotate(90);
      else if (act === 'cancel') finish(false);
      else if (act === 'apply') finish(true);
    });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
  });
}
