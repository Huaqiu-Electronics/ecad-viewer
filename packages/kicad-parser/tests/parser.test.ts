import { SchematicParser } from '../src/schematic_parser';
import fs from 'fs'
import path from 'path'

describe('Test parse and save', () => {
  it('should parse and save the KiCad schematic file correctly', () => {
    const parser = new SchematicParser()
    const filePath = path.join(__dirname, 'ampli_ht.kicad_sch')
    const originalContent = fs.readFileSync(filePath, 'utf8')
    
    const parsed = parser.parse(originalContent)
    const savedContent = parser.save(parsed)
    
    expect(savedContent).toEqual(originalContent)
  })
})
