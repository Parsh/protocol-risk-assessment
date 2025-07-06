/**
 * Debug Slither JSON Parsing
 * Isolate and fix the JSON parsing issue
 */

import { promises as fs } from 'fs';
import path from 'path';
import { VulnerabilityParser } from './src/analyzers/smart-contract/vulnerability-parser';

async function debugSlitherParsing(): Promise<void> {
  try {
    console.log('🔍 Debugging Slither JSON Parsing...\n');

    // Read the working JSON file we know was generated
    const jsonPath = path.join(__dirname, 'tmp/slither-analysis/test-simple-config.json');
    
    console.log(`📄 Reading JSON file: ${jsonPath}`);
    const jsonContent = await fs.readFile(jsonPath, 'utf8');
    
    console.log(`📏 JSON file size: ${jsonContent.length} characters`);
    console.log('📝 First 500 characters:');
    console.log(jsonContent.substring(0, 500));
    console.log('...\n');

    // Parse the JSON
    console.log('🔧 Parsing JSON...');
    const parsedData = JSON.parse(jsonContent);
    
    console.log('✅ JSON parsed successfully!');
    console.log('📊 Parsed structure:');
    console.log(`- success: ${parsedData.success}`);
    console.log(`- error: ${parsedData.error}`);
    console.log(`- results: ${parsedData.results ? 'present' : 'missing'}`);
    
    if (parsedData.results) {
      console.log(`- detectors: ${parsedData.results.detectors ? parsedData.results.detectors.length : 'missing'} items`);
      
      if (parsedData.results.detectors && parsedData.results.detectors.length > 0) {
        console.log('\n🔍 First detector result:');
        const firstDetector = parsedData.results.detectors[0];
        console.log(`- check: ${firstDetector.check}`);
        console.log(`- impact: ${firstDetector.impact}`);
        console.log(`- confidence: ${firstDetector.confidence}`);
        console.log(`- elements: ${firstDetector.elements ? firstDetector.elements.length : 'missing'} items`);
        
        if (firstDetector.elements && firstDetector.elements.length > 0) {
          console.log('\n📍 First element:');
          const firstElement = firstDetector.elements[0];
          console.log(`- type: ${firstElement.type}`);
          console.log(`- name: ${firstElement.name}`);
          console.log(`- source_mapping: ${firstElement.source_mapping ? 'present' : 'missing'}`);
          
          if (firstElement.source_mapping) {
            console.log(`- lines: ${firstElement.source_mapping.lines ? firstElement.source_mapping.lines : 'missing'}`);
            console.log(`- lines type: ${typeof firstElement.source_mapping.lines}`);
            console.log(`- lines length: ${firstElement.source_mapping.lines ? firstElement.source_mapping.lines.length : 'N/A'}`);
          }
        }
      }
    }

    // Test the vulnerability parser
    console.log('\n🧪 Testing VulnerabilityParser...');
    const vulnerabilities = VulnerabilityParser.parseVulnerabilities(parsedData.results?.detectors || []);
    
    console.log(`✅ Parsed ${vulnerabilities.length} vulnerabilities successfully!`);
    
    if (vulnerabilities.length > 0) {
      console.log('\n📋 First vulnerability:');
      const firstVuln = vulnerabilities[0];
      if (firstVuln) {
        console.log(`- detector: ${firstVuln.detector}`);
        console.log(`- severity: ${firstVuln.severity}`);
        console.log(`- confidence: ${firstVuln.confidence}`);
        console.log(`- description: ${firstVuln.description.substring(0, 100)}...`);
        console.log(`- location: ${firstVuln.location.filename}:${firstVuln.location.startLine}`);
      }
    }

    console.log('\n✅ Debugging completed successfully!');

  } catch (error) {
    console.error('❌ Debugging failed:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugSlitherParsing();
}

export { debugSlitherParsing };
