export const formatTeethRange = (teeth?: string[]): string => {
  if (!teeth || teeth.length === 0) return '-';

  // Group by quadrant
  const groups: Record<string, number[]> = {};
  teeth.forEach(t => {
    const q = t.charAt(0);
    const n = parseInt(t.charAt(1));
    if (!groups[q]) groups[q] = [];
    groups[q].push(n);
  });

  const parts: string[] = [];

  Object.keys(groups).sort().forEach(q => {
    const nums = groups[q].sort((a, b) => a - b);
    let start = nums[0];
    let prev = nums[0];
    
    for (let i = 1; i <= nums.length; i++) {
      if (i === nums.length || nums[i] !== prev + 1) {
        if (start === prev) {
          parts.push(`${q}${start}`);
        } else {
          parts.push(`${q}${start}-${q}${prev}`);
        }
        if (i < nums.length) {
          start = nums[i];
          prev = nums[i];
        }
      } else {
        prev = nums[i];
      }
    }
  });

  return parts.join(', ');
};
