const { careerForTitle, promptFor } = require('./careers');
const { getImageService } = require('./services/image/instance');
const { imageUrlFor } = require('./imageUrl');

/**
 * The shared portrait for a saved career: the career's current scene (kicked
 * off, idempotent) so an archived or shared cover never points at a lost or
 * outdated image; the stored id for a career that has left the table; or,
 * for a result older than image ids, its legacy image URL.
 */
function sharedPortraitId(title, portraitSubject, storedImageId) {
  const career = careerForTitle(title);
  if (career) {
    return getImageService().kickoff({
      scenePrompt: promptFor(career, portraitSubject || 'surprise'),
      title: career.title,
    }).id;
  }
  return storedImageId || null;
}

function portraitUrlFor(title, portraitSubject, storedImageId, legacyImageUrl) {
  const id = sharedPortraitId(title, portraitSubject, storedImageId);
  if (id) return imageUrlFor(id);
  return legacyImageUrl || null;
}

module.exports = { portraitUrlFor, sharedPortraitId };
