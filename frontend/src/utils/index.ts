const hRange: [number, number] = [0, 359];
const sRange: [number, number] = [60, 255];
const lRange: [number, number] = [25, 10];

const generateHSL = (name: string): [number, number, number] => {
  const getHashOfString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const normalizeHash = (hash: number, min: number, max: number): number => {
    return Math.floor((hash % (max - min)) + min);
  };

  const hash = getHashOfString(name);
  const h = normalizeHash(hash, hRange[0], hRange[1]);
  const s = normalizeHash(hash, sRange[0], sRange[1]);
  const l = normalizeHash(hash, lRange[0], lRange[1]);

  return [h, s, l];
};

const HSLtoString = (hsl: [number, number, number]): string => {
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
};

export const generateColor = (name: string = ""): string => {
  return HSLtoString(generateHSL(name));
};

export const generateInitials = (name: string = ""): string => {
  const splitName = name.split(" ");
  return `${splitName[0]?.charAt(0) || ""}${splitName[1]?.charAt(0) || ""}`;
};