// The selfie chosen on the questionnaire's last step, held in memory until
// the result is saved and it can be uploaded (Loading page). Deliberately
// not sessionStorage: a face photo shouldn't sit in browser storage, and a
// reload simply drops it (the result page then offers to add it again).
let photo = null;

export const pendingPhoto = {
  set(blob) {
    photo = blob || null;
  },
  get() {
    return photo;
  },
  clear() {
    photo = null;
  },
};
