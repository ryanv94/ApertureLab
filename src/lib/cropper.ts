/** Modal crop/rotate dialog (Cropper.js, loaded on demand). Resolves to the cropped, rotated image at full resolution, or null if cancelled. */
export async function openCropper(source: ImageBitmap, aspect: number | null, title = 'Crop photo'): Promise<ImageBitmap | null> {
  // Pages using this import 'cropperjs/dist/cropper.css' in their frontmatter (dynamic CSS isn't emitted by Astro).
  const { default: Cropper } = await import('cropperjs');

  const c = document.createElement('canvas');
  c.width = source.width; c.height = source.height;
  c.getContext('2d')!.drawImage(source, 0, 0);
  const url = URL.createObjectURL(await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.95)));

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

  return new Promise((resolve) => {
    let done = false;
    const finish = async (apply: boolean) => {
      if (done) return;
      done = true;
      let out: ImageBitmap | null = null;
      if (apply) {
        const canvas = cropper.getCroppedCanvas({ maxWidth: 16384, maxHeight: 16384, imageSmoothingQuality: 'high' });
        out = await createImageBitmap(canvas);
      }
      cropper.destroy();
      URL.revokeObjectURL(url);
      dialog.close();
      dialog.remove();
      resolve(out);
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
