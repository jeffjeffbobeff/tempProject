import React from 'react';
import { Text } from 'react-native';

// Simple memoization cache for parsed text
const textCache = new Map();
const CACHE_SIZE_LIMIT = 100; // Prevent memory leaks

// Clear cache when it gets too large
const clearCacheIfNeeded = () => {
  if (textCache.size > CACHE_SIZE_LIMIT) {
    const keys = Array.from(textCache.keys());
    // Remove oldest entries (first 20)
    keys.slice(0, 20).forEach(key => textCache.delete(key));
  }
};

// Generate a cache key for the text and style
const generateCacheKey = (text, baseStyle) => {
  if (!text || !baseStyle) return null;
  
  // Create a simple hash of the text and style properties
  const styleHash = JSON.stringify({
    fontSize: baseStyle.fontSize,
    color: baseStyle.color,
    fontWeight: baseStyle.fontWeight,
    fontStyle: baseStyle.fontStyle,
    lineHeight: baseStyle.lineHeight,
    textAlign: baseStyle.textAlign,
  });
  
  return `${text.length}_${text.slice(0, 50)}_${styleHash}`;
};

// Parse italic text within a given part
const parseItalicText = (part, baseStyle, parentIndex) => {
  if (!part.trim()) return null;
  
  const italicParts = part.split(/(\*[^*]+\*)/g);
  return italicParts.map((italicPart, italicIndex) => {
    if (italicPart.startsWith('*') && italicPart.endsWith('*')) {
      // This is italic text - remove the asterisks and apply italic style
      const italicText = italicPart.slice(1, -1);
      return (
        <Text 
          key={`italic-${parentIndex}-${italicIndex}`} 
          style={[baseStyle, { fontStyle: 'italic' }]}
        >
          {italicText}
        </Text>
      );
    } else if (italicPart.trim()) {
      // This is regular text
      return (
        <Text 
          key={`regular-${parentIndex}-${italicIndex}`} 
          style={baseStyle}
        >
          {italicPart}
        </Text>
      );
    }
    return null;
  }).filter(Boolean);
};

// Parse bold text (double asterisks)
const parseBoldText = (part, baseStyle, index) => {
  if (part.startsWith('**') && part.endsWith('**')) {
    // This is bold text - remove the double asterisks and apply bold style
    const boldText = part.slice(2, -2);
    return (
      <Text 
        key={`bold-${index}`} 
        style={[baseStyle, { fontWeight: 'bold' }]}
      >
        {boldText}
      </Text>
    );
  } else if (part.trim()) {
    // This might contain italic text, so process it further
    return parseItalicText(part, baseStyle, index);
  }
  return null;
};

/**
 * Parse text with markdown-style formatting (bold and italic)
 * Supports **bold** and *italic* text
 * 
 * @param {string} text - The text to parse
 * @param {object} baseStyle - The base style object to apply (optional)
 * @returns {React.Element|null} - The formatted text component or null if no text
 */
export const parseFormattedText = (text, baseStyle = null) => {
  if (!text) return null;
  
  // Check cache first
  const cacheKey = generateCacheKey(text, baseStyle);
  if (cacheKey && textCache.has(cacheKey)) {
    return textCache.get(cacheKey);
  }
  
  // Parse the text
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  const processedParts = boldParts.map((part, index) => 
    parseBoldText(part, baseStyle, index)
  ).filter(Boolean);
  
  // Flatten the array since we might have nested arrays from italic processing
  const flatParts = processedParts.flat();
  
  // Create the result component
  const result = (
    <Text style={baseStyle || {}}>
      {flatParts}
    </Text>
  );
  
  // Cache the result
  if (cacheKey) {
    textCache.set(cacheKey, result);
    clearCacheIfNeeded();
  }
  
  return result;
};

/**
 * Clear the text formatting cache
 * Useful for memory management or when styles change significantly
 */
export const clearTextCache = () => {
  textCache.clear();
};

/**
 * Get cache statistics for debugging
 */
export const getTextCacheStats = () => {
  return {
    size: textCache.size,
    limit: CACHE_SIZE_LIMIT,
  };
}; 