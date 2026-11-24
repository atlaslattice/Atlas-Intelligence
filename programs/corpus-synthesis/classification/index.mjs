/** Node-only, caller-supplied source classification. Importing performs no reads. */
export {
  ARIADNE_SOURCE,
  CLASSIFIER_VERSION,
  AriadneCandidateClassifier,
  createCorpusGrouper,
  prepareCorpusGroups,
  candidateGraphRecords,
  compactClassificationRecord,
  validateCandidateEvidence,
  canonicalJsonSha256
} from './classifier.mjs';
export {loadSourceText,resolveCorpusFile} from './text-files.mjs';
export {streamDocumentsMetadata,verifyDocumentsFileUnchanged} from './documents-file.mjs';
