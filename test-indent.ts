// Test the indentString function
function indentString(level: number): string {
    return '\t'.repeat(level);
}

// Test different indent levels
console.log('Testing indentString function:');
for (let i = 0; i < 5; i++) {
    console.log(`Level ${i}: ${JSON.stringify(indentString(i))}`);
}

// Now test with spaces
function indentStringSpaces(level: number): string {
    return '    '.repeat(level);
}

console.log('\nTesting indentString with spaces:');
for (let i = 0; i < 5; i++) {
    console.log(`Level ${i}: ${JSON.stringify(indentStringSpaces(i))}`);
}
