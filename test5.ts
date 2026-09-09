import { getNfcUidFormats, findMatchingNfcBox } from './services/nfcServices';

const inputCode = "0131046483";

console.log("Formats of input:", getNfcUidFormats(inputCode));

const boxes = [
  {
    id: "1",
    numeroCaixa: "1",
    uid: "539CCF07",
    uidHex: "539CCF07",
    uidDecimal: "131046483",
    uid4ByteHex: "07CF9C53", // whatever it generated
    textoGravado: "BOX-1",
    status: "Associada"
  }
];

const boxFormats = getNfcUidFormats(boxes[0].uid);
console.log("Formats of box UID:", boxFormats);

console.log("Matching:", findMatchingNfcBox(inputCode, boxes as any));
