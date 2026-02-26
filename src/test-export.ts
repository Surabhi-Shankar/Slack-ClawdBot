// test-export.ts
import { cosineSimilarity } from './src/rag/embeddings.js';

console.log('Testing cosineSimilarity export:');
console.log('cosineSimilarity is a:', typeof cosineSimilarity);

// Test with sample vectors
const vec1 = [1, 0, 0];
const vec2 = [0, 1, 0];
const similarity = cosineSimilarity(vec1, vec2);
console.log('Similarity between perpendicular vectors:', similarity); // Should be 0

console.log('✅ Export test passed!');