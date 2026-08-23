import re

with open('components/Scanner.tsx', 'r') as f:
    code = f.read()

# We want to remove any lines that are part of the broken useEffects
# which are located before the `useState` definitions for selectedItemIds.

# Let's locate the start of GlobalScanner
start_idx = code.find('export const GlobalScanner: React.FC = () => {')
# Let's locate selectedItemIds
end_idx = code.find('  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);')

if start_idx != -1 and end_idx != -1:
    section = code[start_idx:end_idx]
    
    # We want to remove the broken useEffects from this section
    # The broken useEffect starts with `useEffect(() => {` and ends with `}, [processScan]);`
    # Let's just remove anything that matches this pattern
    cleaned_section = re.sub(r'\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[processScan\]\);\n', '\n', section)
    
    # Also remove any stray `return () => { ... }, [processScan]);`
    cleaned_section = re.sub(r'\s*return \(\) => \{[\s\S]*?\}, \[processScan\]\);\n', '\n', cleaned_section)
    
    code = code[:start_idx] + cleaned_section + code[end_idx:]

with open('components/Scanner.tsx', 'w') as f:
    f.write(code)

print("Cleaned!")
