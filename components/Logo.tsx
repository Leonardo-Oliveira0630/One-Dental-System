import React, { useState, useEffect } from 'react';
import * as storagePkg from 'firebase/storage';
import { storage } from '../services/firebaseConfig';

const { ref, getDownloadURL } = storagePkg as any;

// ==========================================
// CONFIGURAÇÃO DA LOGO DO SMILEPROX
// ==========================================

// ALTERNATIVA 1: CAMINHO RELATIVO LOCAL (ALTAMENTE RECOMENDADO)
// Se você fez o upload do arquivo 'logoapp.svg' ou de um 'logo.png' diretamente para a pasta raiz 
// ou pasta pública do seu projeto (usando a barra lateral esquerda do AI Studio), digite o caminho abaixo.
// Exemplo: '/logoapp.svg' se estiver carregado na pasta pública do servidor.
export const LOGO_LOCAL_PATH: string = ''; 

// ALTERNATIVA 2: CÓDIGO SVG BRUTO (MUITO SEGURO E RÁPIDO)
// Abra o seu arquivo '.svg' no Bloco de Notas ou qualquer editor de texto, copie todo o código 
// (começando com `<svg` e terminando com `</svg>`) e cole-o entre as aspas abaixo:
export const LOGO_SVG_RAW: string = ''; 

// ALTERNATIVA 3: IMAGEM EM BASE64
// Se você converteu o seu logo para Base64 (usando conversores online), cole o resultado aqui:
export const LOGO_BASE64: string = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPgo8Zz4KPHBhdGggZD0iTSAzODIuMzYgNTc5LjI1IEwgMzgxLjc0IDU4My4wMCBMIDM2NS41NiA1ODMuMDAgQzM2NC41Niw1ODMuMDAgMzYzLjYxLDU4My4wMCAzNjIuNzAsNTgzLjAwIEMzNTMuNTcsNTgzLjAyIDM0OS4xMyw1ODMuMDMgMzQ2Ljk5LDU4MC44MiBDMzQ0Ljk2LDU3OC43NCAzNDQuOTgsNTc0LjY4IDM0NS4wMCw1NjYuODAgQzM0NS4wMCw1NjUuOTcgMzQ1LjAwLDU2NS4xMCAzNDUuMDAsNTY0LjE4IEMzNDUuMDAsNTYyLjk1IDM0NC45OSw1NjEuODAgMzQ0Ljk5LDU2MC43MiBDMzQ0Ljk2LDU1My4wMCAzNDQuOTQsNTQ5LjA2IDM0Ni45MCw1NDcuMDUgQzM0OC45Niw1NDQuOTQgMzUzLjE5LDU0NC45NiAzNjEuODQsNTQ0Ljk5IEMzNjMuMDAsNTQ1LjAwIDM2NC4yNCw1NDUuMDAgMzY1LjU2LDU0NS4wMCBMIDM4My4wMCA1NDUuMDAgTCAzODIuOTkgNTYwLjI1IEMzODIuOTgsNTY4LjY0IDM4Mi43MCw1NzcuMTkgMzgyLjM2LDU3OS4yNSBaTSAzNzIuMDAgNDYzLjAwIEwgMzcyLjAwIDQ5OC4wMCBMIDM1Ni43NSA0OTcuOTcgQzM0Mi4wNyw0OTcuOTQgMzM4LjY0LDQ5Ny4zNiAzMzYuNzcsNDk0LjU5IEMzMzYuMzYsNDkzLjk5IDMzNi4wMiw0ODcuMzggMzM2LjAyLDQ3OS45MCBDMzM2LjAxLDQ3OC45NSAzMzYuMDEsNDc4LjA1IDMzNi4wMSw0NzcuMjEgQzMzNS45Nyw0NzAuNDYgMzM1Ljk2LDQ2Ni45MCAzMzcuNzIsNDY1LjA0IEMzMzkuNjksNDYyLjk2IDM0My44Niw0NjIuOTcgMzUyLjY2LDQ2Mi45OSBDMzUzLjY2LDQ2My4wMCAzNTQuNzEsNDYzLjAwIDM1NS44Myw0NjMuMDAgWk0gMzI2LjgwIDU0MS44MCBDMzI0Ljk3LDU0My42MyAyOTkuOTksNTQzLjQ0IDI5Ny40NCw1NDEuNTggQzI5NS42OCw1NDAuMjkgMjk1LjUwLDUzOC44NiAyOTUuNTAsNTI2LjAwIEMyOTUuNTAsNTEzLjE1IDI5NS42OCw1MTEuNzIgMjk3LjQ0LDUxMC40MiBDMjk5Ljk4LDUwOC41NiAzMjQuOTcsNTA4LjM3IDMyNi44MCw1MTAuMjAgQzMyOC40Nyw1MTEuODcgMzI4LjQ3LDU0MC4xMyAzMjYuODAsNTQxLjgwIFpNIDQwOC44MCA0NjEuODAgQzQwOC4wMiw0NjIuNTggNDAzLjkwLDQ2My4wMCAzOTYuOTUsNDYzLjAwIEMzODMuMDMsNDYzLjAwIDM4My4wMCw0NjIuOTcgMzgzLjAwLDQ0OC44NyBDMzgzLjAwLDQ0Mi4wNiAzODMuNDIsNDM3Ljk4IDM4NC4yMCw0MzcuMjAgQzM4NS44NSw0MzUuNTUgNDA3LjE1LDQzNS41NSA0MDguODAsNDM3LjIwIEM0MTAuNDUsNDM4Ljg1IDQxMC40NSw0NjAuMTUgNDA4LjgwLDQ2MS44MCBaTSA0MTguMjggNjQ2LjA1IEM0MTcuODUsNjQ2LjQ0IDQxMi42OSw2NDcuMDcgNDA2LjgxLDY0Ny40NCBDMzkyLjMzLDY0OC4zNyAzOTIuMTEsNjQ4LjE1IDM5Mi40Nyw2MzMuNTQgQzM5Mi42MSw2MjcuNjcgMzkzLjE2LDYyMi40NCAzOTMuNzAsNjIxLjkwIEMzOTQuMjUsNjIxLjM1IDM5OS44MSw2MjEuMDYgNDA2LjU4LDYyMS4yMiBMIDQxOC41MCA2MjEuNTAgTCA0MTguNzggNjMzLjQyIEM0MTguOTQsNjM5Ljk3IDQxOC43MSw2NDUuNjYgNDE4LjI4LDY0Ni4wNSBaTSAzNzIuMjUgNjM1LjAwIEwgMzcxLjUwIDY0Mi41MCBMIDM2MC40MCA2NDIuNzggQzM1MS43NSw2NDMuMDAgMzQ5LjA0LDY0Mi43NSAzNDguMTEsNjQxLjY0IEMzNDcuMzIsNjQwLjY4IDM0Ny4wMyw2MzYuNTEgMzQ3LjIyLDYyOC44NiBMIDM0Ny41MCA2MTcuNTAgTCAzNTkuNjcgNjE3LjIyIEwgMzcxLjg1IDYxNi45NCBMIDM3Mi40MyA2MjIuMjIgQzM3Mi43NCw2MjUuMTIgMzcyLjY2LDYzMC44OCAzNzIuMjUsNjM1LjAwIFpNIDQyMi45MiA1NzQuNjAgQzQyMS42Miw1NzYuMTYgNDA3LjQ5LDU3Ni42MCA0MDUuMjEsNTc1LjE1IEM0MDQuMjcsNTc0LjU2IDQwNC4wMCw1NzEuNzggNDA0LjIxLDU2NC45MiBMIDQwNC41MCA1NTUuNTAgTCA0MjMuNTAgNTU1LjUwIEwgNDIzLjc5IDU2NC4zNSBDNDIzLjk4LDU3MC4wMSA0MjMuNjYsNTczLjcwIDQyMi45Miw1NzQuNjAgWk0gMzI1Ljk2IDYwMy4wNyBDMzI1LjEwLDYwNC42OSAzMjMuODUsNjA1LjAwIDMxOC4yMSw2MDQuOTcgQzMwOC42OCw2MDQuOTMgMzA4LjAwLDYwNC4zNCAzMDguMDAsNTk2LjAzIEwgMzA4LjAwIDU5NS44MSBDMzA4LjAwLDU5MC43MSAzMDguMDAsNTg4LjI2IDMwOS4yMiw1ODcuMDkgQzMxMC4zNSw1ODYuMDAgMzEyLjUzLDU4Ni4wMCAzMTYuNzEsNTg2LjAwIEwgMzE2LjkxIDU4Ni4wMCBDMzIxLjU2LDU4Ni4wMCAzMjUuMDcsNTg2LjQ3IDMyNS44MCw1ODcuMjAgQzMyNy4yOCw1ODguNjggMzI3LjQwLDYwMC4zOSAzMjUuOTYsNjAzLjA3IFpNIDI4Ny4zOSA1NjYuNDIgQzI4Ni45Myw1NjcuNjMgMjg1LjMxLDU2OC4wMCAyODAuNTYsNTY4LjAwIEMyNzcuMTQsNTY4LjAwIDI3NC4wMyw1NjcuNzAgMjczLjY3LDU2Ny4zMyBDMjczLjMwLDU2Ni45NyAyNzMuMDAsNTYzLjU5IDI3My4wMCw1NTkuODMgTCAyNzMuMDAgNTUzLjAwIEwgMjc5Ljg5IDU1My4wMCBDMjg3LjY1LDU1My4wMCAyODguMDAsNTUzLjMyIDI4OC4wMCw1NjAuNTAgQzI4OC4wMCw1NjIuODkgMjg3LjczLDU2NS41NSAyODcuMzksNTY2LjQyIFpNIDI3NC4zOSA1MTYuNDIgQzI3My45Niw1MTcuNTUgMjcyLjQ1LDUxOC4wMCAyNjkuMDYsNTE4LjAwIEMyNjMuNDIsNTE4LjAwIDI2My4wMCw1MTcuNjcgMjYzLjAwLDUxMy4yNCBDMjYzLjAwLDUxMC42NSAyNjIuNTEsNTA5LjY4IDI2MS4wMCw1MDkuMjkgQzI1OS4zOCw1MDguODcgMjU5LjAwLDUwNy45MyAyNTkuMDAsNTA0LjM4IEwgMjU5LjAwIDUwMC4wMCBMIDI2NC4wMCA1MDAuMDAgQzI2OC42Nyw1MDAuMDAgMjY5LjAwLDUwMC4xNyAyNjkuMDAsNTAyLjUwIEMyNjkuMDAsNTA0LjQ3IDI2OS41MSw1MDUuMDAgMjcxLjM5LDUwNS4wMCBDMjc0LjA5LDUwNS4wMCAyNzUuMDAsNTA2LjY0IDI3NS4wMCw1MTEuNTAgQzI3NS4wMCw1MTMuMzQgMjc0LjczLDUxNS41NSAyNzQuMzksNTE2LjQyIFpNIDMyMC41MCA1NTYuNTAgTCAzMjAuNTAgNTY5LjUwIEwgMzE1LjUwIDU2OS43NiBDMzA4LjUzLDU3MC4xMiAzMDcuODMsNTY5LjQzIDMwOC4yMCw1NjIuNDEgTCAzMDguNTAgNTU2LjUwIFpNIDQyMS41MCA1MTIuNTAgTCA0MjEuNTAgNTIyLjUwIEwgNDE3LjI0IDUyMi44MSBDNDEyLjM3LDUyMy4xNiA0MTEuNzAsNTIyLjMwIDQxMi4xOCw1MTYuMzYgTCA0MTIuNTAgNTEyLjUwIFpNIDI4Mi41MCA1OTAuNTAgQzI4Mi41MCw1OTQuMzYgMjgyLjM3LDU5NC41MSAyNzkuMDAsNTk0Ljc2IEMyNzQuMTksNTk1LjEyIDI3Mi43OSw1OTMuOTUgMjczLjE4LDU4OS45MCBDMjczLjQ5LDU4Ni41OSAyNzMuNjEsNTg2LjUwIDI3OC4wMCw1ODYuNTAgTCAyODIuNTAgNTg2LjUwIFpNIDI5OC44MSA1NzYuMTcgQzI5OC4zMSw1ODIuODkgMjk1LjAwLDU4Mi41OSAyOTUuMDAsNTc1LjgzIEMyOTUuMDAsNTcyLjYzIDI5NS4zNCw1NzIuMDAgMjk3LjA2LDU3Mi4wMCBDMjk4Ljg1LDU3Mi4wMCAyOTkuMDgsNTcyLjUzIDI5OC44MSw1NzYuMTcgWiIgZmlsbD0icmdiKDYsMTg5LDIxMykiLz4KPHBhdGggZD0iTSAzODIuMzYgNTc5LjI1IEMzODIuNzAsNTc3LjE5IDM4Mi45OCw1NjguNjQgMzgyLjk5LDU2MC4yNSBMIDM4My4wMCA1NDUuMDAgTCAzNjUuNTYgNTQ1LjAwIEMzNjQuMjQsNTQ1LjAwIDM2My4wMCw1NDUuMDAgMzYxLjg0LDU0NC45OSBMIDM2MS44NCA1NDQuOTkgQzM2MC4yNiw1NDQuOTggMzU4LjgzLDU0NC45OCAzNTcuNTQsNTQ0Ljk5IEMzNTkuMzcsNTQ0Ljk2IDM2MS40Nyw1NDQuOTcgMzYzLjg2LDU0NC45OSBDMzY1LjQxLDU0NC45OSAzNjcuMDksNTQ1LjAwIDM2OC45MCw1NDUuMDAgQzM4Ny43Nyw1NDUuMDAgMzg5Ljg0LDU0NC44MyAzOTEuMzUsNTQzLjE3IEMzOTIuNzAsNTQxLjY3IDM5My4wMCw1MzkuMDcgMzkzLjAwLDUyOC44MyBDMzkzLjAwLDUxMy4wNyAzOTIuOTUsNTEzLjAwIDM4MC42Nyw1MTMuMDAgTCAzNzIuMDAgNTEzLjAwIEwgMzcyLjAwIDQ5OC4wMCBMIDM1Ni45MyA0OTguMDAgQzM0OC4wNiw0OTguMDAgMzQzLjIwLDQ5Ny43NiAzNDAuMzMsNDk2Ljk1IEMzNDMuMTMsNDk3LjczIDM0Ny44OSw0OTcuOTUgMzU2Ljc1LDQ5Ny45NyBMIDM3Mi4wMCA0OTguMDAgTCAzNzIuMDAgNDYzLjAwIEwgMzcxLjg3IDQ2My4wMCBMIDM3Mi4yMyA0MTIuNzUgTCAzNzIuNjAgMzYyLjUwIEwgMzc1LjE4IDM1Mi45OSBDMzg0LjkxLDMxNy4xNSA0MTAuNjMsMjkxLjQ3IDQ0NS45OSwyODIuMzAgQzQ1OC44MiwyNzguOTYgNDgzLjczLDI3Ny45MSA0OTIuMDksMjgwLjM0IEM1MDAuMjgsMjgyLjcyIDUwNS4yMywyODYuNzcgNTA4Ljg4LDI5NC4wOCBDNTExLjQ1LDI5OS4yMiA1MTEuOTksMzAxLjQ4IDUxMS45NiwzMDYuOTEgQzUxMS45MCwzMTQuODIgNTEwLjM4LDMxOS40NyA1MDYuMDUsMzI0Ljk0IEM0OTkuOTUsMzMyLjY0IDQ5MC45MywzMzUuOTkgNDc2LjIwLDMzNi4wMSBDNDU0LjcyLDMzNi4wNCA0NDAuMTksMzQ2LjE0IDQzMy4xOSwzNjUuODggQzQzMS43MSwzNzAuMDQgNDMxLjUyLDM4Mi4zMSA0MzEuMjUsNDg5LjQ4IEM0MzEuMDUsNTcwLjI3IDQzMS4yOSw2MTAuMDkgNDMyLjAxLDYxMy41NCBDNDM0Ljc0LDYyNi43MiA0NDMuMzgsNjM3LjU4IDQ1NC44MCw2NDIuMjAgQzQ2MC40OCw2NDQuNDkgNDYwLjcwLDY0NC41MCA1MTYuMTEsNjQ0Ljc5IEwgNTcxLjcyIDY0NS4wOCBMIDU3Mi4yNiA2MjAuMjkgQzU3Mi43Miw1OTguODYgNTczLjA3LDU5NC42MSA1NzQuODgsNTg4LjkzIEM1NzguNjcsNTc3LjAxIDU4Ni44NSw1NjYuNjkgNTk3LjM5LDU2MC41MSBDNjA2Ljc0LDU1NS4wMyA2MDguNzgsNTU0Ljc3IDY0Ny41MCw1NTMuOTkgQzY3NS43Miw1NTMuNDIgNjg0LjQ5LDU1Mi45NCA2ODguMDksNTUxLjczIEM3MDMuMjEsNTQ2LjY2IDcxNS4wMiw1MzYuODcgNzIxLjQ4LDUyNC4wMyBDNzMzLjE3LDUwMC44MiA3MzMuOTEsNDY1Ljg5IDcyMy40MCw0MzMuODEgQzcxNy44Miw0MTYuNzkgNzA0LjQ2LDQwMS41MiA2ODkuMTQsMzk0LjY0IEM2NzYuODgsMzg5LjE0IDY3My43MywzODguOTEgNjE1LjYzLDM4OS4yMiBMIDU2Mi40NSAzODkuNTAgTCA1NTUuNzggMzkyLjc4IEM1NDguNzcsMzk2LjI0IDU0NC4zMiw0MDAuODAgNTQxLjI2LDQwNy42NiBDNTM5LjcwLDQxMS4xOCA1MzkuNTUsNDE4LjU5IDUzOS41Myw0OTcuMDAgTCA1MzkuNTAgNTgyLjUwIEwgNTM3LjExIDU4Ny43OSBDNTMwLjk0LDYwMS40NCA1MTUuMjAsNjA3LjU1IDUwMi4wMCw2MDEuNDMgQzQ5NS4xNCw1OTguMjQgNDkxLjU2LDU5NC45MCA0ODguMTYsNTg4LjUwIEwgNDg1LjUwIDU4My41MCBMIDQ4NS41MiA0OTQuMDAgQzQ4NS41NCw0MDQuNjAgNDg1LjU0LDQwNC40OSA0ODcuNzcsMzk2LjUwIEM0OTQuNTEsMzcyLjIxIDUxMC41OSwzNTIuNzcgNTMyLjUwLDM0Mi40MSBDNTQ3LjkwLDMzNS4xMiA1NDkuMjUsMzM1LjAwIDYxNC4zOSwzMzUuMDAgQzY3Ni41NCwzMzUuMDAgNjgxLjczLDMzNS4zMyA2OTcuMDAsMzQwLjIxIEM3NTMuMjksMzU4LjE5IDc4NC45MCw0MTIuMTEgNzgyLjczLDQ4Ni40MCBDNzgxLjk2LDUxMi41NSA3NzguMTksNTMwLjM4IDc2OS41Niw1NDguNjIgQzc2My42Miw1NjEuMTggNzU4LjA2LDU2OS4xMSA3NDguNTgsNTc4LjUyIEM3MzQuODgsNTkyLjEzIDcyMS45OCw1OTkuNDIgNzAyLjEzLDYwNC43NyBDNjkyLjk3LDYwNy4yNCA2OTEuMDYsNjA3LjM4IDY2My4wMCw2MDcuNzAgQzY0Ni43OCw2MDcuODkgNjMyLjUyLDYwOC4yNiA2MzEuMzIsNjA4LjUyIEM2MjYuMTUsNjA5LjY2IDYyNi4wMCw2MTAuNDEgNjI2LjAwLDYzNS4zNiBDNjI2LjAwLDY2MS4xMiA2MjUuMjYsNjY1Ljk3IDYxOS44MSw2NzYuMjEgQzYxNi4xNSw2ODMuMDcgNjA3LjIyLDY5MS43MyA2MDAuNjAsNjk0Ljg1IEM1OTguMDQsNjk2LjA1IDU5My4xNSw2OTcuNzAgNTg5LjcyLDY5OC41MCBDNTg0LjU1LDY5OS43MiA1NzIuMTEsNjk5Ljk1IDUxNi4wMCw2OTkuODYgQzQ3OC44OCw2OTkuODAgNDQ1LjgyLDY5OS4zNyA0NDIuNTQsNjk4Ljg5IEM0MTQuODAsNjk0Ljg1IDM5MS4yNSw2NzcuMjAgMzc5LjQ3LDY1MS42MiBDMzc3LjY3LDY0Ny43MCAzNzUuNzQsNjQyLjcwIDM3NS4yMCw2NDAuNTAgTCAzNzUuMTAgNjQwLjExIEMzNzMuNjksNjM0LjQ2IDM3My4wOCw2MzIuMDAgMzcyLjcyLDYzMi4wNCBDMzcyLjYwLDYzMi4wNSAzNzIuNTIsNjMyLjI5IDM3Mi40Myw2MzIuNzUgQzM3Mi42OCw2MjguOTggMzcyLjY5LDYyNC42MiAzNzIuNDMsNjIyLjIyIEwgMzcxLjg1IDYxNi45NCBMIDM1OS42NyA2MTcuMjIgTCAzNDcuNTAgNjE3LjUwIEwgMzY4LjUwIDYxNi43MiBDMzgzLjEwLDYxNi4xNyAzODkuMDQsNjE2LjI5IDM5MS40Myw2MTMuNDQgQzM5My4wNyw2MTEuNDkgMzkzLjA1LDYwOC4xNSAzOTMuMDEsNjAyLjI2IEMzOTMuMDEsNjAxLjM0IDM5My4wMCw2MDAuMzcgMzkzLjAwLDU5OS4zMiBDMzkzLjAwLDU5Mi40NyAzOTIuNTMsNTg2LjAwIDM5MS45Niw1ODQuOTMgQzM5MC45OSw1ODMuMTIgMzg5LjY3LDU4My4wMCAzNzAuMTUsNTgzLjAwIEMzNjguNDksNTgzLjAwIDM2Ni45Myw1ODMuMDEgMzY1LjQ3LDU4My4wMSBDMzYzLjAyLDU4My4wMiAzNjAuODYsNTgzLjAyIDM1OC45Niw1ODMuMDEgQzM2MC4wOSw1ODMuMDEgMzYxLjMyLDU4My4wMSAzNjIuNjUsNTgzLjAwIEwgMzYyLjcwIDU4My4wMCBDMzYzLjYxLDU4My4wMCAzNjQuNTYsNTgzLjAwIDM2NS41Niw1ODMuMDAgTCAzODEuNzQgNTgzLjAwIFpNIDYxNy42NiA1NDUuMjkgQzYxNi41NSw1NDguMDEgNjE1LjU2LDU0OC41NiA2MDguMTYsNTUwLjUyIEwgNTk5Ljg5IDU1Mi43MCBMIDU5NS45NSA1NDkuODUgQzU4NS42Nyw1NDIuNDEgNTc5LjkyLDUyOS44MSA1NzYuNjEsNTA3LjUwIEM1NzUuNjAsNTAwLjY3IDU3My42Nyw0OTMuNzYgNTcwLjUzLDQ4NS43MyBDNTY1LjAxLDQ3MS42MiA1NjMuNjUsNDY0Ljk3IDU2NC4yMiw0NTUuMDAgQzU2NS4wMCw0NDEuNjIgNTcxLjYxLDQzMS43MCA1ODMuMjUsNDI2LjQ2IEM1OTQuNTAsNDIxLjM5IDYwMS4xNSw0MjEuODYgNjE5LjYxLDQyOS4wMyBMIDYyOS43MyA0MzIuOTUgTCA2MzguNDcgNDI5LjQzIEM2NjEuNjQsNDIwLjA5IDY3My44Niw0MjEuMjcgNjg1LjI3LDQzMy45NSBDNjk1LjAwLDQ0NC43NyA2OTYuNDgsNDYyLjE1IDY4OS4yOCw0ODEuMDAgQzY4My44NSw0OTUuMjEgNjgzLjA0LDQ5OC4wMiA2ODEuNTYsNTA3LjkzIEM2NzguODksNTI1Ljc3IDY3My45Miw1MzguMTkgNjY2LjIyLDU0Ni4yOCBDNjYzLjYxLDU0OS4wMiA2NjMuNDAsNTQ5LjA2IDY1My4xNCw1NDguNzggQzY0My4zMiw1NDguNTIgNjQyLjYwLDU0OC4zNSA2NDAuODksNTQ2LjAwIEM2MzkuNzgsNTQ0LjQ2IDYzOC4yOSw1MzguNzMgNjM3LjAzLDUzMS4xMyBDNjM0Ljg4LDUxOC4xMyA2MzIuMDcsNTEwLjAwIDYyOS43MSw1MTAuMDAgQzYyOC4xNiw1MTAuMDAgNjI1Ljg1LDUxMi4zNSA2MjQuMTMsNTE1LjY5IEM2MjMuNTAsNTE2Ljg5IDYyMi4wNyw1MjMuMzYgNjIwLjk1LDUzMC4wNiBDNjE5LjgyLDUzNi43NyA2MTguMzUsNTQzLjYyIDYxNy42Niw1NDUuMjkgWk0gNTk5LjE4IDUzNy40NiBDNjAzLjQ0LDU0Mi4zMSA2MDYuMzAsNTQzLjE3IDYwNy45NCw1NDAuMTEgQzYwOC41MCw1MzkuMDcgNjA5LjQ3LDUzMy43OCA2MTAuMTAsNTI4LjM2IEM2MTEuNDQsNTE2Ljg3IDYxMy43Niw1MDkuOTYgNjE3Ljk5LDUwNC44MiBDNjI1Ljg2LDQ5NS4yOCA2MzguNDcsNDk4LjM2IDY0My45OCw1MTEuMTggQzY0NS4yMSw1MTQuMDMgNjQ3LjA4LDUyMS43NCA2NDguMTMsNTI4LjMyIEM2NDkuMTksNTM0Ljg5IDY1MC4yOSw1NDAuNjYgNjUwLjU4LDU0MS4xNCBDNjUxLjc3LDU0My4wNiA2NTQuOTYsNTQxLjc5IDY1OC4zNCw1MzguMDUgQzY2NC45Miw1MzAuNzYgNjY4LjIxLDUyMi4wNCA2NzAuNDgsNTA1Ljg3IEM2NzEuNTIsNDk4LjQzIDY3My4zNCw0OTEuNTYgNjc2LjUzLDQ4My4wMiBDNjgzLjk2LDQ2My4xNiA2ODQuNTIsNDU1LjcxIDY3OS4zOSw0NDUuMjAgQzY3NS41Niw0MzcuMzUgNjcwLjczLDQzNC40NyA2NjEuNTcsNDM0LjU5IEM2NTYuMzIsNDM0LjY1IDY1Mi45NSw0MzUuMzQgNjQ4LjUwLDQzNy4yNSBDNjMwLjc3LDQ0NC44OSA2MzAuNTcsNDQ0Ljk1IDYyNC4wMCw0NDQuOTMgQzYyMC40Miw0NDQuOTIgNjE2LjE1LDQ0NC4zMyA2MTQuNTAsNDQzLjYyIEwgNjExLjUwIDQ0Mi4zNCBMIDYxNS40NCA0NDEuMDMgTCA2MTkuMzkgNDM5LjcyIEwgNjEwLjQ0IDQzNi45MiBDNjAwLjQzLDQzMy43OCA1OTYuOTUsNDMzLjQ4IDU5MC4yOCw0MzUuMTYgQzU4MS41Myw0MzcuMzYgNTc1LjAwLDQ0Ny4xMCA1NzUuMDAsNDU3Ljk3IEM1NzUuMDAsNDYzLjg5IDU3Ny4wNCw0NzEuNjYgNTgxLjUwLDQ4Mi43MCBDNTgzLjQ2LDQ4Ny41NCA1ODUuNzMsNDk1LjMzIDU4Ni41Niw1MDAuMDAgQzU4Ny4zOCw1MDQuNjcgNTg4LjUzLDUxMS4xNyA1ODkuMTEsNTE0LjQzIEM1OTAuNjUsNTIzLjE3IDU5NC42NSw1MzIuMzIgNTk5LjE4LDUzNy40NiBaTSAzMjguMzQgNDUwLjc0IEMzMjcuMTgsNDUxLjU5IDMyMi42NSw0NTIuMDAgMzE0LjQ2LDQ1Mi4wMCBDMzEzLjg3LDQ1Mi4wMCAzMTMuMzAsNDUyLjAwIDMxMi43NCw0NTIuMDAgQzMwNi4xNCw0NTIuMDEgMzAyLjY4LDQ1Mi4wMiAzMDAuODksNDUwLjI5IEMyOTguOTIsNDQ4LjM4IDI5OS4wMSw0NDQuMzYgMjk5LjE4LDQzNS44OSBDMjk5LjE5LDQzNS4yNSAyOTkuMjEsNDM0LjU4IDI5OS4yMiw0MzMuODkgTCAyOTkuNTAgNDE5LjUwIEwgMzI5LjUwIDQxOS41MCBMIDMyOS43OCA0MzQuNDkgQzMzMC4wMiw0NDcuNzIgMzI5Ljg1LDQ0OS42MyAzMjguMzQsNDUwLjc0IFpNIDI5Mi4zOSA0OTMuNDIgQzI5MS44OCw0OTQuNzUgMjg5LjcwLDQ5NS4wMCAyNzguNTksNDk1LjAwIEMyNjkuNjcsNDk1LjAwIDI2NS4wMSw0OTQuNjEgMjY0LjIwLDQ5My44MCBDMjYyLjU0LDQ5Mi4xNCAyNjIuNTQsNDY3Ljg2IDI2NC4yMCw0NjYuMjAgQzI2NS4wMSw0NjUuMzkgMjY5LjY3LDQ2NS4wMCAyNzguNTksNDY1LjAwIEMyODkuNzAsNDY1LjAwIDI5MS44OCw0NjUuMjUgMjkyLjM5LDQ2Ni41OCBDMjkzLjE4LDQ2OC42NCAyOTMuMTgsNDkxLjM2IDI5Mi4zOSw0OTMuNDIgWk0gNDA4LjgwIDQ2MS44MCBDNDEwLjQ1LDQ2MC4xNSA0MTAuNDUsNDM4Ljg1IDQwOC44MCw0MzcuMjAgQzQwNy4xNSw0MzUuNTUgMzg1Ljg1LDQzNS41NSAzODQuMjAsNDM3LjIwIEMzODMuNDIsNDM3Ljk4IDM4My4wMCw0NDIuMDYgMzgzLjAwLDQ0OC44NyBDMzgzLjAwLDQ2Mi45NyAzODMuMDMsNDYzLjAwIDM5Ni45NSw0NjMuMDAgQzQwMy45MCw0NjMuMDAgNDA4LjAyLDQ2Mi41OCA0MDguODAsNDYxLjgwIFpNIDQxOC4yOCA2NDYuMDUgQzQxOC43MSw2NDUuNjYgNDE4Ljk0LDYzOS45NyA0MTguNzgsNjMzLjQyIEwgNDE4LjUwIDYyMS41MCBMIDQwNi41OCA2MjEuMjIgQzM5OS44MSw2MjEuMDYgMzk0LjI1LDYyMS4zNSAzOTMuNzAsNjIxLjkwIEMzOTMuMTYsNjIyLjQ0IDM5Mi42MSw2MjcuNjcgMzkyLjQ3LDYzMy41NCBDMzkyLjExLDY0OC4xNSAzOTIuMzMsNjQ4LjM3IDQwNi44MSw2NDcuNDQgQzQxMi42OSw2NDcuMDcgNDE3Ljg1LDY0Ni40NCA0MTguMjgsNjQ2LjA1IFpNIDQyMi45MiA1NzQuNjAgQzQyMy42Niw1NzMuNzAgNDIzLjk4LDU3MC4wMSA0MjMuNzksNTY0LjM1IEwgNDIzLjUwIDU1NS41MCBMIDQwNC41MCA1NTUuNTAgTCA0MDQuMjEgNTY0LjkyIEM0MDQuMDAsNTcxLjc4IDQwNC4yNyw1NzQuNTYgNDA1LjIxLDU3NS4xNSBDNDA3LjQ5LDU3Ni42MCA0MjEuNjIsNTc2LjE2IDQyMi45Miw1NzQuNjAgWk0gMjU3LjUwIDUxNi41MCBMIDI1Ny41MCA1MzEuNTAgTCAyNDIuMDAgNTMyLjA4IEwgMjQyLjAwIDUxNS45MiBaTSAyODcuODAgNTM3LjI1IEwgMjg3LjUwIDU0Mi41MCBMIDI4My41MCA1NDIuNjkgQzI3Ny42MSw1NDIuOTggMjc3LjAwLDU0Mi40NCAyNzcuMDAsNTM2LjkyIEwgMjc3LjAwIDUzMi4wMCBMIDI4OC4xMCA1MzIuMDAgWk0gMjgxLjAwIDUyMC4wMCBMIDI4MS4wMCA1MzAuMDAgTCAyNzYuNjcgNTMwLjAwIEMyNzQuMjgsNTMwLjAwIDI3Mi4wMyw1MjkuNzAgMjcxLjY3LDUyOS4zMyBDMjcxLjMwLDUyOC45NyAyNzEuMDAsNTI2LjcyIDI3MS4wMCw1MjQuMzMgTCAyNzEuMDAgNTIwLjAwIFpNIDQyMS41MCA1MTIuNTAgTCA0MTIuNTAgNTEyLjUwIEwgNDEyLjE4IDUxNi4zNiBDNDExLjcwLDUyMi4zMCA0MTIuMzcsNTIzLjE2IDQxNy4yNCw1MjIuODEgTCA0MjEuNTAgNTIyLjUwIFpNIDI2Ny4wMCA1NjYuNTAgQzI2Ny4wMCw1NjkuNzIgMjY2Ljc2LDU3MC4wMCAyNjQuMDAsNTcwLjAwIEMyNjEuMjQsNTcwLjAwIDI2MS4wMCw1NjkuNzIgMjYxLjAwLDU2Ni41MCBDMjYxLjAwLDU2My4yOCAyNjEuMjQsNTYzLjAwIDI2NC4wMCw1NjMuMDAgQzI2Ni43Niw1NjMuMDAgMjY3LjAwLDU2My4yOCAyNjcuMDAsNTY2LjUwIFpNIDM0NS43OCA1NDguOTIgQzM0NC45NSw1NTEuMjQgMzQ0Ljk2LDU1NC45MSAzNDQuOTksNTYwLjcyIEMzNDQuOTksNTYxLjgwIDM0NS4wMCw1NjIuOTUgMzQ1LjAwLDU2NC4xOCBDMzQ1LjAwLDU2NS4xMCAzNDUuMDAsNTY1Ljk3IDM0NS4wMCw1NjYuODAgQzM0NC45OCw1NzIuOTggMzQ0Ljk3LDU3Ni44MSAzNDUuOTQsNTc5LjE4IEMzNDQuOTMsNTc2LjkyIDM0NC45NSw1NzMuMzUgMzQ0Ljk5LDU2Ny42OCBDMzQ0Ljk5LDU2Ni42MCAzNDUuMDAsNTY1LjQzIDM0NS4wMCw1NjQuMTggQzM0NS4wMCw1NjIuNzMgMzQ0Ljk5LDU2MS4zOCAzNDQuOTgsNTYwLjE0IEMzNDQuOTQsNTU0LjY3IDM0NC45Miw1NTEuMTYgMzQ1Ljc4LDU0OC45MiBaTSAzMzguNDggNDk2LjIwIEMzMzcuNzMsNDk1Ljc3IDMzNy4xOSw0OTUuMjQgMzM2Ljc3LDQ5NC42MCBDMzM2LjYwLDQ5NC4zNSAzMzYuNDQsNDkzLjAyIDMzNi4zMSw0OTEuMDIgQzMzNi40NCw0OTMuMDIgMzM2LjYwLDQ5NC4zMyAzMzYuNzcsNDk0LjU5IEMzMzcuMjEsNDk1LjI0IDMzNy43NCw0OTUuNzcgMzM4LjQ4LDQ5Ni4yMCBaTSAzMzcuNzIgNDY1LjAzIEMzMzkuMTAsNDYzLjU4IDM0MS41Niw0NjMuMTUgMzQ1Ljk0LDQ2My4wMyBDMzQxLjU2LDQ2My4xNSAzMzkuMTAsNDYzLjU4IDMzNy43Miw0NjUuMDQgQzMzNy40NCw0NjUuMzQgMzM3LjIwLDQ2NS42OCAzMzcuMDAsNDY2LjA4IEMzMzcuMjAsNDY1LjY4IDMzNy40NCw0NjUuMzMgMzM3LjcyLDQ2NS4wMyBaIiBmaWxsPSJyZ2IoMTksNDAsNzEpIi8+CjxwYXRoIGQ9Ik0gMC4wMCA1MTIuMDAgTCAwLjAwIDAuMDAgTCA1MTIuMDAgMC4wMCBMIDEwMjQuMDAgMC4wMCBMIDEwMjQuMDAgNTEyLjAwIEwgMTAyNC4wMCAxMDI0LjAwIEwgNTEyLjAwIDEwMjQuMDAgTCAwLjAwIDEwMjQuMDAgTCAwLjAwIDUxMi4wMCBaTSA1ODkuNzIgNjk4LjUwIEM1OTMuMTUsNjk3LjcwIDU5OC4wNCw2OTYuMDUgNjAwLjYwLDY5NC44NSBDNjA3LjIyLDY5MS43MyA2MTYuMTUsNjgzLjA3IDYxOS44MSw2NzYuMjEgQzYyNS4yNiw2NjUuOTcgNjI2LjAwLDY2MS4xMiA2MjYuMDAsNjM1LjM2IEM2MjYuMDAsNjEwLjQxIDYyNi4xNSw2MDkuNjYgNjMxLjMyLDYwOC41MiBDNjMyLjUyLDYwOC4yNiA2NDYuNzgsNjA3Ljg5IDY2My4wMCw2MDcuNzAgQzY5MS4wNiw2MDcuMzggNjkyLjk3LDYwNy4yNCA3MDIuMTMsNjA0Ljc3IEM3MjEuOTgsNTk5LjQyIDczNC44OCw1OTIuMTMgNzQ4LjU4LDU3OC41MiBDNzU4LjA2LDU2OS4xMSA3NjMuNjIsNTYxLjE4IDc2OS41Niw1NDguNjIgQzc3OC4xOSw1MzAuMzggNzgxLjk2LDUxMi41NSA3ODIuNzMsNDg2LjQwIEM3ODQuOTAsNDEyLjExIDc1My4yOSwzNTguMTkgNjk3LjAwLDM0MC4yMSBDNjgxLjczLDMzNS4zMyA2NzYuNTQsMzM1LjAwIDYxNC4zOSwzMzUuMDAgQzU0OS4yNSwzMzUuMDAgNTQ3LjkwLDMzNS4xMiA1MzIuNTAsMzQyLjQxIEM1MTAuNTksMzUyLjc3IDQ5NC41MSwzNzIuMjEgNDg3Ljc3LDM5Ni41MCBDNDg1LjU0LDQwNC40OSA0ODUuNTQsNDA0LjYwIDQ4NS41Miw0OTQuMDAgTCA0ODUuNTAgNTgzLjUwIEwgNDg4LjE2IDU4OC41MCBDNDkxLjU2LDU5NC45MCA0OTUuMTQsNTk4LjI0IDUwMi4wMCw2MDEuNDMgQzUxNS4yMCw2MDcuNTUgNTMwLjk0LDYwMS40NCA1MzcuMTEsNTg3Ljc5IEwgNTM5LjUwIDU4Mi41MCBMIDUzOS41MyA0OTcuMDAgQzUzOS41NSw0MTguNTkgNTM5LjcwLDQxMS4xOCA1NDEuMjYsNDA3LjY2IEM1NDQuMzIsNDAwLjgwIDU0OC43NywzOTYuMjQgNTU1Ljc4LDM5Mi43OCBMIDU2Mi40NSAzODkuNTAgTCA2MTUuNjMgMzg5LjIyIEM2NzMuNzMsMzg4LjkxIDY3Ni44OCwzODkuMTQgNjg5LjE0LDM5NC42NCBDNzA0LjQ2LDQwMS41MiA3MTcuODIsNDE2Ljc5IDcyMy40MCw0MzMuODEgQzczMy45MSw0NjUuODkgNzMzLjE3LDUwMC44MiA3MjEuNDgsNTI0LjAzIEM3MTUuMDIsNTM2Ljg3IDcwMy4yMSw1NDYuNjYgNjg4LjA5LDU1MS43MyBDNjg0LjQ5LDU1Mi45NCA2NzUuNzIsNTUzLjQyIDY0Ny41MCw1NTMuOTkgQzYwOC43OCw1NTQuNzcgNjA2Ljc0LDU1NS4wMyA1OTcuMzksNTYwLjUxIEM1ODYuODUsNTY2LjY5IDU3OC42Nyw1NzcuMDEgNTc0Ljg4LDU4OC45MyBDNTczLjA3LDU5NC42MSA1NzIuNzIsNTk4Ljg2IDU3Mi4yNiw2MjAuMjkgTCA1NzEuNzIgNjQ1LjA4IEwgNTE2LjExIDY0NC43OSBDNDYwLjcwLDY0NC41MCA0NjAuNDgsNjQ0LjQ5IDQ1NC44MCw2NDIuMjAgQzQ0My4zOCw2MzcuNTggNDM0Ljc0LDYyNi43MiA0MzIuMDEsNjEzLjU0IEM0MzEuMjksNjEwLjA5IDQzMS4wNSw1NzAuMjcgNDMxLjI1LDQ4OS40OCBDNDMxLjUyLDM4Mi4zMSA0MzEuNzEsMzcwLjA0IDQzMy4xOSwzNjUuODggQzQ0MC4xOSwzNDYuMTQgNDU0LjcyLDMzNi4wNCA0NzYuMjAsMzM2LjAxIEM0OTAuOTMsMzM1Ljk5IDQ5OS45NSwzMzIuNjQgNTA2LjA1LDMyNC45NCBDNTEwLjM4LDMxOS40NyA1MTEuOTAsMzE0LjgyIDUxMS45NiwzMDYuOTEgQzUxMS45OSwzMDEuNDggNTExLjQ1LDI5OS4yMiA1MDguODgsMjk0LjA4IEM1MDUuMjMsMjg2Ljc3IDUwMC4yOCwyODIuNzIgNDkyLjA5LDI4MC4zNCBDNDgzLjczLDI3Ny45MSA0NTguODIsMjc4Ljk2IDQ0NS45OSwyODIuMzAgQzQxMC42MywyOTEuNDcgMzg0LjkxLDMxNy4xNSAzNzUuMTgsMzUyLjk5IEwgMzcyLjYwIDM2Mi41MCBMIDM3Mi4yMyA0MTIuNzUgTCAzNzEuODcgNDYzLjAwIEwgMzU1Ljc2IDQ2My4wMCBDMzM0LjgzLDQ2My4wMCAzMzYuMDAsNDYyLjAwIDMzNi4wMiw0NzkuOTAgQzMzNi4wMiw0ODcuMzggMzM2LjM2LDQ5NC4wMCAzMzYuNzcsNDk0LjYwIEMzMzguNjEsNDk3LjM2IDM0Mi4zOCw0OTguMDAgMzU2LjkzLDQ5OC4wMCBMIDM3Mi4wMCA0OTguMDAgTCAzNzIuMDAgNTA1LjUwIEwgMzcyLjAwIDUxMy4wMCBMIDM4MC42NyA1MTMuMDAgQzM5Mi45NSw1MTMuMDAgMzkzLjAwLDUxMy4wNyAzOTMuMDAsNTI4LjgzIEMzOTMuMDAsNTM5LjA3IDM5Mi43MCw1NDEuNjcgMzkxLjM1LDU0My4xNyBDMzg5Ljg0LDU0NC44MyAzODcuNzcsNTQ1LjAwIDM2OC45MCw1NDUuMDAgQzM0My4wNiw1NDUuMDAgMzQ1LjAwLDU0My40NCAzNDUuMDAsNTY0LjE4IEMzNDUuMDAsNTg0LjMyIDM0My4yMyw1ODMuMDAgMzcwLjE1LDU4My4wMCBDMzg5LjY3LDU4My4wMCAzOTAuOTksNTgzLjEyIDM5MS45Niw1ODQuOTMgQzM5Mi41Myw1ODYuMDAgMzkzLjAwLDU5Mi40NyAzOTMuMDAsNTk5LjMyIEMzOTMuMDAsNjE2LjkwIDM5NC42NCw2MTUuNzQgMzY4LjUwLDYxNi43MiBMIDM0Ny41MCA2MTcuNTAgTCAzNDcuMjIgNjI4Ljg2IEMzNDcuMDMsNjM2LjUxIDM0Ny4zMiw2NDAuNjggMzQ4LjExLDY0MS42NCBDMzQ5LjA0LDY0Mi43NSAzNTEuNzUsNjQzLjAwIDM2MC40MCw2NDIuNzggTCAzNzEuNTAgNjQyLjUwIEwgMzcyLjA0IDYzNi41MCBDMzcyLjYyLDYzMC4wMyAzNzIuNTgsNjI5Ljk4IDM3NS4yMCw2NDAuNTAgQzM3NS43NCw2NDIuNzAgMzc3LjY3LDY0Ny43MCAzNzkuNDcsNjUxLjYyIEMzOTEuMjUsNjc3LjIwIDQxNC44MCw2OTQuODUgNDQyLjU0LDY5OC44OSBDNDQ1LjgyLDY5OS4zNyA0NzguODgsNjk5LjgwIDUxNi4wMCw2OTkuODYgQzU3Mi4xMSw2OTkuOTUgNTg0LjU1LDY5OS43MiA1ODkuNzIsNjk4LjUwIFpNIDMyNS45NiA2MDMuMDcgQzMyNy40MCw2MDAuMzkgMzI3LjI4LDU4OC42OCAzMjUuODAsNTg3LjIwIEMzMjUuMDcsNTg2LjQ3IDMyMS41Niw1ODYuMDAgMzE2LjkxLDU4Ni4wMCBDMzA3LjkzLDU4Ni4wMCAzMDguMDAsNTg1LjkyIDMwOC4wMCw1OTYuMDMgQzMwOC4wMCw2MDQuMzQgMzA4LjY4LDYwNC45MyAzMTguMjEsNjA0Ljk3IEMzMjMuODUsNjA1LjAwIDMyNS4xMCw2MDQuNjkgMzI1Ljk2LDYwMy4wNyBaTSAyODIuNTAgNTkwLjUwIEwgMjgyLjUwIDU4Ni41MCBMIDI3OC4wMCA1ODYuNTAgQzI3My42MSw1ODYuNTAgMjczLjQ5LDU4Ni41OSAyNzMuMTgsNTg5LjkwIEMyNzIuNzksNTkzLjk1IDI3NC4xOSw1OTUuMTIgMjc5LjAwLDU5NC43NiBDMjgyLjM3LDU5NC41MSAyODIuNTAsNTk0LjM2IDI4Mi41MCw1OTAuNTAgWk0gMjk4LjgxIDU3Ni4xNyBDMjk5LjA4LDU3Mi41MyAyOTguODUsNTcyLjAwIDI5Ny4wNiw1NzIuMDAgQzI5NS4zNCw1NzIuMDAgMjk1LjAwLDU3Mi42MyAyOTUuMDAsNTc1LjgzIEMyOTUuMDAsNTgyLjU5IDI5OC4zMSw1ODIuODkgMjk4LjgxLDU3Ni4xNyBaTSAyNjcuMDAgNTY2LjUwIEMyNjcuMDAsNTYzLjI4IDI2Ni43Niw1NjMuMDAgMjY0LjAwLDU2My4wMCBDMjYxLjI0LDU2My4wMCAyNjEuMDAsNTYzLjI4IDI2MS4wMCw1NjYuNTAgQzI2MS4wMCw1NjkuNzIgMjYxLjI0LDU3MC4wMCAyNjQuMDAsNTcwLjAwIEMyNjYuNzYsNTcwLjAwIDI2Ny4wMCw1NjkuNzIgMjY3LjAwLDU2Ni41MCBaTSAzMjAuNTAgNTYzLjAwIEwgMzIwLjUwIDU1Ni41MCBMIDMxNC41MCA1NTYuNTAgTCAzMDguNTAgNTU2LjUwIEwgMzA4LjIwIDU2Mi40MSBDMzA3LjgzLDU2OS40MyAzMDguNTMsNTcwLjEyIDMxNS41MCw1NjkuNzYgTCAzMjAuNTAgNTY5LjUwIEwgMzIwLjUwIDU2My4wMCBaTSAyODcuMzkgNTY2LjQyIEMyODcuNzMsNTY1LjU1IDI4OC4wMCw1NjIuODkgMjg4LjAwLDU2MC41MCBDMjg4LjAwLDU1My4zMiAyODcuNjUsNTUzLjAwIDI3OS44OSw1NTMuMDAgTCAyNzMuMDAgNTUzLjAwIEwgMjczLjAwIDU1OS44MyBDMjczLjAwLDU2My41OSAyNzMuMzAsNTY2Ljk3IDI3My42Nyw1NjcuMzMgQzI3NC4wMyw1NjcuNzAgMjc3LjE0LDU2OC4wMCAyODAuNTYsNTY4LjAwIEMyODUuMzEsNTY4LjAwIDI4Ni45Myw1NjcuNjMgMjg3LjM5LDU2Ni40MiBaTSA2MTcuNjYgNTQ1LjI5IEM2MTguMzUsNTQzLjYyIDYxOS44Miw1MzYuNzcgNjIwLjk1LDUzMC4wNiBDNjIyLjA3LDUyMy4zNiA2MjMuNTAsNTE2Ljg5IDYyNC4xMyw1MTUuNjkgQzYyNS44NSw1MTIuMzUgNjI4LjE2LDUxMC4wMCA2MjkuNzEsNTEwLjAwIEM2MzIuMDcsNTEwLjAwIDYzNC44OCw1MTguMTMgNjM3LjAzLDUzMS4xMyBDNjM4LjI5LDUzOC43MyA2MzkuNzgsNTQ0LjQ2IDY0MC44OSw1NDYuMDAgQzY0Mi42MCw1NDguMzUgNjQzLjMyLDU0OC41MiA2NTMuMTQsNTQ4Ljc4IEM2NjMuNDAsNTQ5LjA2IDY2My42MSw1NDkuMDIgNjY2LjIyLDU0Ni4yOCBDNjczLjkyLDUzOC4xOSA2NzguODksNTI1Ljc3IDY4MS41Niw1MDcuOTMgQzY4My4wNCw0OTguMDIgNjgzLjg1LDQ5NS4yMSA2ODkuMjgsNDgxLjAwIEM2OTYuNDgsNDYyLjE1IDY5NS4wMCw0NDQuNzcgNjg1LjI3LDQzMy45NSBDNjczLjg2LDQyMS4yNyA2NjEuNjQsNDIwLjA5IDYzOC40Nyw0MjkuNDMgTCA2MjkuNzMgNDMyLjk1IEwgNjE5LjYxIDQyOS4wMyBDNjAxLjE1LDQyMS44NiA1OTQuNTAsNDIxLjM5IDU4My4yNSw0MjYuNDYgQzU3MS42MSw0MzEuNzAgNTY1LjAwLDQ0MS42MiA1NjQuMjIsNDU1LjAwIEM1NjMuNjUsNDY0Ljk3IDU2NS4wMSw0NzEuNjIgNTcwLjUzLDQ4NS43MyBDNTczLjY3LDQ5My43NiA1NzUuNjAsNTAwLjY3IDU3Ni42MSw1MDcuNTAgQzU3OS45Miw1MjkuODEgNTg1LjY3LDU0Mi40MSA1OTUuOTUsNTQ5Ljg1IEwgNTk5Ljg5IDU1Mi43MCBMIDYwOC4xNiA1NTAuNTIgQzYxNS41Niw1NDguNTYgNjE2LjU1LDU0OC4wMSA2MTcuNjYsNTQ1LjI5IFpNIDI4Ny44MCA1MzcuMjUgTCAyODguMTAgNTMyLjAwIEwgMjgyLjU1IDUzMi4wMCBMIDI3Ny4wMCA1MzIuMDAgTCAyNzcuMDAgNTM2LjkyIEMyNzcuMDAsNTQyLjQ0IDI3Ny42MSw1NDIuOTggMjgzLjUwLDU0Mi42OSBMIDI4Ny41MCA1NDIuNTAgTCAyODcuODAgNTM3LjI1IFpNIDMyNi44MCA1NDEuODAgQzMyOC40Nyw1NDAuMTMgMzI4LjQ3LDUxMS44NyAzMjYuODAsNTEwLjIwIEMzMjQuOTcsNTA4LjM3IDI5OS45OCw1MDguNTYgMjk3LjQ0LDUxMC40MiBDMjk1LjY4LDUxMS43MiAyOTUuNTAsNTEzLjE1IDI5NS41MCw1MjYuMDAgQzI5NS41MCw1MzguODYgMjk1LjY4LDU0MC4yOSAyOTcuNDQsNTQxLjU4IEMyOTkuOTksNTQzLjQ0IDMyNC45Nyw1NDMuNjMgMzI2LjgwLDU0MS44MCBaTSAyNTcuNTAgNTI0LjAwIEwgMjU3LjUwIDUxNi41MCBMIDI0OS43NSA1MTYuMjEgTCAyNDIuMDAgNTE1LjkyIEwgMjQyLjAwIDUyNC4wMCBMIDI0Mi4wMCA1MzIuMDggTCAyNDkuNzUgNTMxLjc5IEwgMjU3LjUwIDUzMS41MCBMIDI1Ny41MCA1MjQuMDAgWk0gMjgxLjAwIDUyNS4wMCBMIDI4MS4wMCA1MjAuMDAgTCAyNzYuMDAgNTIwLjAwIEwgMjcxLjAwIDUyMC4wMCBMIDI3MS4wMCA1MjQuMzMgQzI3MS4wMCw1MjYuNzIgMjcxLjMwLDUyOC45NyAyNzEuNjcsNTI5LjMzIEMyNzIuMDMsNTI5LjcwIDI3NC4yOCw1MzAuMDAgMjc2LjY3LDUzMC4wMCBMIDI4MS4wMCA1MzAuMDAgTCAyODEuMDAgNTI1LjAwIFpNIDI3NC4zOSA1MTYuNDIgQzI3NC43Myw1MTUuNTUgMjc1LjAwLDUxMy4zNCAyNzUuMDAsNTExLjUwIEMyNzUuMDAsNTA2LjY0IDI3NC4wOSw1MDUuMDAgMjcxLjM5LDUwNS4wMCBDMjY5LjUxLDUwNS4wMCAyNjkuMDAsNTA0LjQ3IDI2OS4wMCw1MDIuNTAgQzI2OS4wMCw1MDAuMTcgMjY4LjY3LDUwMC4wMCAyNjQuMDAsNTAwLjAwIEwgMjU5LjAwIDUwMC4wMCBMIDI1OS4wMCA1MDQuMzggQzI1OS4wMCw1MDcuOTMgMjU5LjM4LDUwOC44NyAyNjEuMDAsNTA5LjI5IEMyNjIuNTEsNTA5LjY4IDI2My4wMCw1MTAuNjUgMjYzLjAwLDUxMy4yNCBDMjYzLjAwLDUxNy42NyAyNjMuNDIsNTE4LjAwIDI2OS4wNiw1MTguMDAgQzI3Mi40NSw1MTguMDAgMjczLjk2LDUxNy41NSAyNzQuMzksNTE2LjQyIFpNIDI5Mi4zOSA0OTMuNDIgQzI5My4xOCw0OTEuMzYgMjkzLjE4LDQ2OC42NCAyOTIuMzksNDY2LjU4IEMyOTEuODgsNDY1LjI1IDI4OS43MCw0NjUuMDAgMjc4LjU5LDQ2NS4wMCBDMjY5LjY3LDQ2NS4wMCAyNjUuMDEsNDY1LjM5IDI2NC4yMCw0NjYuMjAgQzI2Mi41NCw0NjcuODYgMjYyLjU0LDQ5Mi4xNCAyNjQuMjAsNDkzLjgwIEMyNjUuMDEsNDk0LjYxIDI2OS42Nyw0OTUuMDAgMjc4LjU5LDQ5NS4wMCBDMjg5LjcwLDQ5NS4wMCAyOTEuODgsNDk0Ljc1IDI5Mi4zOSw0OTMuNDIgWk0gMzI4LjM0IDQ1MC43NCBDMzI5Ljg1LDQ0OS42MyAzMzAuMDIsNDQ3LjcyIDMyOS43OCw0MzQuNDkgTCAzMjkuNTAgNDE5LjUwIEwgMzE0LjUwIDQxOS41MCBMIDI5OS41MCA0MTkuNTAgTCAyOTkuMjIgNDMzLjg5IEMyOTguODYsNDUyLjcyIDI5OC4yNSw0NTIuMDAgMzE0LjQ2LDQ1Mi4wMCBDMzIyLjY1LDQ1Mi4wMCAzMjcuMTgsNDUxLjU5IDMyOC4zNCw0NTAuNzQgWk0gNTk5LjE4IDUzNy40NiBDNTk0LjY1LDUzMi4zMiA1OTAuNjUsNTIzLjE3IDU4OS4xMSw1MTQuNDMgQzU4OC41Myw1MTEuMTcgNTg3LjM4LDUwNC42NyA1ODYuNTYsNTAwLjAwIEM1ODUuNzMsNDk1LjMzIDU4My40Niw0ODcuNTQgNTgxLjUwLDQ4Mi43MCBDNTc3LjA0LDQ3MS42NiA1NzUuMDAsNDYzLjg5IDU3NS4wMCw0NTcuOTcgQzU3NS4wMCw0NDcuMTAgNTgxLjUzLDQzNy4zNiA1OTAuMjgsNDM1LjE2IEM1OTYuOTUsNDMzLjQ4IDYwMC40Myw0MzMuNzggNjEwLjQ0LDQzNi45MiBMIDYxOS4zOSA0MzkuNzIgTCA2MTUuNDQgNDQxLjAzIEwgNjExLjUwIDQ0Mi4zNCBMIDYxNC41MCA0NDMuNjIgQzYxNi4xNSw0NDQuMzMgNjIwLjQyLDQ0NC45MiA2MjQuMDAsNDQ0LjkzIEM2MzAuNTcsNDQ0Ljk1IDYzMC43Nyw0NDQuODkgNjQ4LjUwLDQzNy4yNSBDNjUyLjk1LDQzNS4zNCA2NTYuMzIsNDM0LjY1IDY2MS41Nyw0MzQuNTkgQzY3MC43Myw0MzQuNDcgNjc1LjU2LDQzNy4zNSA2NzkuMzksNDQ1LjIwIEM2ODQuNTIsNDU1LjcxIDY4My45Niw0NjMuMTYgNjc2LjUzLDQ4My4wMiBDNjczLjM0LDQ5MS41NiA2NzEuNTIsNDk4LjQzIDY3MC40OCw1MDUuODcgQzY2OC4yMSw1MjIuMDQgNjY0LjkyLDUzMC43NiA2NTguMzQsNTM4LjA1IEM2NTQuOTYsNTQxLjc5IDY1MS43Nyw1NDMuMDYgNjUwLjU4LDU0MS4xNCBDNjUwLjI5LDU0MC42NiA2NDkuMTksNTM0Ljg5IDY0OC4xMyw1MjguMzIgQzY0Ny4wOCw1MjEuNzQgNjQ1LjIxLDUxNC4wMyA2NDMuOTgsNTExLjE4IEM2MzguNDcsNDk4LjM2IDYyNS44Niw0OTUuMjggNjE3Ljk5LDUwNC44MiBDNjEzLjc2LDUwOS45NiA2MTEuNDQsNTE2Ljg3IDYxMC4xMCw1MjguMzYgQzYwOS40Nyw1MzMuNzggNjA4LjUwLDUzOS4wNyA2MDcuOTQsNTQwLjExIEM2MDYuMzAsNTQzLjE3IDYwMy40NCw1NDIuMzEgNTk5LjE4LDUzNy40NiBaIiBmaWxsPSJyZ2IoMjUzLDI1NCwyNTQpIi8+CjwvZz4KPC9zdmc+'; // Ex: 'data:image/svg+xml;base64,PHN2Z...'

// ALTERNATIVA 4: LINKS DE ARMAZENAMENTO NUVEM (Requer permissões públicas de leitura configuradas no console do Firebase)
// 1. Se você fez o upload da imagem da LOGO COMPLETA (que já contém o dente E o texto "SmileProX" juntos),
//    substitua as aspas simples de LOGO_COMPLETO_URL pelo seu link. Exemplo: 'https://sua-url-do-firebase.svg'
export const LOGO_COMPLETO_URL: string = ''; 

// 2. Se você fez o upload APENAS do ícone do dente separado e quer ue o sistema continue escrevendo
//    o texto "SmileProX" ao lado via código, cole o seu link em LOGO_ICONE_URL abaixo:
export const LOGO_ICONE_URL: string = ''; 
// ==========================================

// Versão em texto do SVG de dente em alta qualidade para usar como Favicon padrão caso não haja upload
const DEFAULT_SVG_FAVICON = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="20" y1="15" x2="80" y2="85"><stop offset="0%" stop-color="%231E4D8C" /><stop offset="40%" stop-color="%230F4C81" /><stop offset="100%" stop-color="%230B3256" /></linearGradient><linearGradient id="g2" x1="10" y1="75" x2="90" y2="45"><stop offset="0%" stop-color="%2300E5FF" /><stop offset="50%" stop-color="%2300B8D9" /><stop offset="100%" stop-color="%230D9488" /></linearGradient></defs><path d="M 32 23 C 25 23, 23 35, 27 50 C 30 62, 33 72, 37 77 C 40 81, 43 75, 45 70 C 47 62, 49 62, 51 70 C 53 75, 56 81, 59 77 C 63 72, 65 60, 67 52 C 68 45, 68 39, 68 35 H 61 V 27 C 61 24, 57 23, 51 28 C 47 22, 39 21, 32 23 Z" fill="url(%23g1)" /><rect x="63" y="29" width="6" height="6" rx="1" fill="%230F4C81" /><rect x="71.5" y="23" width="5.5" height="5.5" rx="1" fill="%2300B8D9" /><rect x="71" y="15.5" width="4" height="4" rx="0.5" fill="%2300E5FF" /><path d="M 16 51 C 14 56, 24 64, 43 60 C 62 55, 75 46, 81 37 C 71 47, 51 55, 36 55 C 23 55, 18 51, 16 51 Z" fill="url(%23g2)" /></svg>`;

// Função auxiliar para converter URLs diversas do Firebase Storage para o formato gs://
const normalizeToGsUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  
  // Se for gs:// já está correto
  if (cleaned.startsWith('gs://')) {
    return cleaned;
  }
  
  // Remove protocolos se houver
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  
  // Se contiver firebasestorage.app ou firebase-storage, reconstrói o formato gs://
  if (cleaned.includes('firebasestorage.app')) {
    const parts = cleaned.split('/');
    const bucket = parts[0];
    const path = parts.slice(1).join('/');
    return `gs://${bucket}/${path}`;
  }
  
  return url;
};

// Hook utilitário para resolver URLs "gs://" do Firebase Storage em links HTTPS válidos e tratá-los no navegador
export const useStorageUrl = (url: string) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setResolvedUrl('');
      return;
    }

    const normalized = normalizeToGsUrl(url);

    if (normalized.startsWith('gs://')) {
      if (storage) {
        getDownloadURL(ref(storage, normalized))
          .then((downloadUrl: string) => {
            setResolvedUrl(downloadUrl);
          })
          .catch((err: any) => {
            console.warn('[Storage Info] Usando fallback HTTPS REST público para:', normalized);
            const match = normalized.match(/^gs:\/\/([^/]+)\/(.+)$/);
            if (match) {
              const bucket = match[1];
              const filePath = match[2];
              const encodedPath = encodeURIComponent(filePath);
              setResolvedUrl(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`);
            } else {
              setResolvedUrl(url);
            }
          });
      } else {
        // Fallback se o storage do Firebase não estiver livre de inicialização
        const match = normalized.match(/^gs:\/\/([^/]+)\/(.+)$/);
        if (match) {
          const bucket = match[1];
          const filePath = match[2];
          const encodedPath = encodeURIComponent(filePath);
          setResolvedUrl(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`);
        } else {
          setResolvedUrl(url);
        }
      }
    } else {
      // Se não for Firebase, mas for um link http:// comum, garantir que tentemos servir via HTTPS se possível
      if (url.startsWith('http://')) {
        setResolvedUrl(url.replace('http://', 'https://'));
      } else {
        setResolvedUrl(url);
      }
    }
  }, [url]);

  return resolvedUrl;
};

// Hook de efeito para atualizar o favicon e apple-touch-icon globalmente pelas páginas
export const useBrowserMetadataEffect = (iconicUrl: string, completeUrl: string) => {
  const finalIconUrl = useStorageUrl(iconicUrl);
  const finalCompletoUrl = useStorageUrl(completeUrl);

  useEffect(() => {
    let faviconUrl = DEFAULT_SVG_FAVICON;

    // Prioridade de Favicon nas Abas do Navegador:
    if (LOGO_SVG_RAW) {
      // Converte o SVG Bruto em uma Data URL segura
      faviconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG_RAW)}`;
    } else if (LOGO_BASE64) {
      faviconUrl = LOGO_BASE64.startsWith('data:') 
        ? LOGO_BASE64 
        : `data:image/svg+xml;base64,${LOGO_BASE64}`;
    } else if (LOGO_LOCAL_PATH) {
      faviconUrl = LOGO_LOCAL_PATH;
    } else if (finalCompletoUrl) {
      faviconUrl = finalCompletoUrl;
    } else if (finalIconUrl) {
      faviconUrl = finalIconUrl;
    }

    // Atualiza / Cria o favicon nas abas do navegador
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = faviconUrl;
    faviconLink.type = faviconUrl.startsWith('data:image/svg') || faviconUrl.includes('svg') 
      ? 'image/svg+xml' 
      : 'image/png';

    // Atualiza / Cria o apple touch icon
    let appleIconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleIconLink) {
      appleIconLink = document.createElement('link');
      appleIconLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleIconLink);
    }
    appleIconLink.href = faviconUrl;
  }, [finalIconUrl, finalCompletoUrl]);
};

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'colored';
}

export const LogoIcon: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const finalIconUrl = useStorageUrl(LOGO_ICONE_URL);
  
  // Executa o hook de metadados de navegador nas abas
  useBrowserMetadataEffect(LOGO_ICONE_URL, LOGO_COMPLETO_URL);

  // Map friendly size presets to dimensions
  const dimensions = typeof size === 'number' 
    ? size 
    : {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64
      }[size];

  // 1. SUPORTE A CÓDIGO SVG BRUTO (ALTAMENTE SEGURO)
  if (LOGO_SVG_RAW) {
    return (
      <div 
        style={{ width: dimensions, height: dimensions }}
        className={`shrink-0 flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain ${className}`}
        dangerouslySetInnerHTML={{ __html: LOGO_SVG_RAW }}
      />
    );
  }

  // 2. SUPORTE A IMAGENS BASE64
  if (LOGO_BASE64) {
    const imgSrc = LOGO_BASE64.startsWith('data:') 
      ? LOGO_BASE64 
      : `data:image/svg+xml;base64,${LOGO_BASE64}`;
    return (
      <img 
        src={imgSrc} 
        alt="SmileProX Icon" 
        style={{ width: dimensions, height: dimensions }}
        className={`object-contain shrink-0 ${className}`} 
      />
    );
  }

  // 3. SUPORTE A IMAGEM LOCAL (EX: /logoapp.svg)
  if (LOGO_LOCAL_PATH) {
    return (
      <img 
        src={LOGO_LOCAL_PATH} 
        alt="SmileProX Icon" 
        style={{ width: dimensions, height: dimensions }}
        className={`object-contain shrink-0 ${className}`} 
      />
    );
  }

  // 4. SUPORTE A ARQUIVO DO FIREBASE STORAGE (SE RESOLVER COM SUCESSO)
  if (finalIconUrl) {
    return (
      <img 
        src={finalIconUrl} 
        alt="SmileProX Icon" 
        style={{ width: dimensions, height: dimensions }}
        className={`object-contain shrink-0 ${className}`} 
      />
    );
  }

  return (
    <svg
      width={dimensions}
      height={dimensions}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="SmileProX Logo"
      {...props}
    >
      <defs>
        {/* Deep blue to indigo 3D metallic gradient for the tooth */}
        <linearGradient id="toothGradient" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E4D8C" />
          <stop offset="40%" stopColor="#0F4C81" />
          <stop offset="100%" stopColor="#0B3256" />
        </linearGradient>

        {/* Shiny highlight gradient for the tooth crown */}
        <linearGradient id="toothHighlight" x1="50" y1="15" x2="50" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F4C81" stopOpacity="0" />
        </linearGradient>

        {/* Teal/cyan gradient for the outer orbit crescent */}
        <linearGradient id="orbitGradient" x1="10" y1="75" x2="90" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#00B8D9" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        
        {/* Subtle drop shadow filter for professional depth */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* High-quality styled vector tooth with an exact digital step/notch on the upper-right shoulder */}
      <path
        d="M 32 23
           C 25 23, 23 35, 27 50
           C 30 62, 33 72, 37 77
           C 40 81, 43 75, 45 70
           C 47 62, 49 62, 51 70
           C 53 75, 56 81, 59 77
           C 63 72, 65 60, 67 52
           C 68 45, 68 39, 68 35
           H 61
           V 27
           C 61 24, 57 23, 51 28
           C 47 22, 39 21, 32 23 Z"
        fill="url(#toothGradient)"
        filter="url(#logoShadow)"
      />

      {/* Accurate Tooth Highlight / 3D Detail */}
      <path
        d="M 32 23
           C 27 23, 25 31, 29 42
           C 33 39, 44 38, 51 28
           C 44 23, 37 23, 32 23 Z"
        fill="url(#toothHighlight)"
        opacity="0.8"
      />

      {/* Tech node lines / squares exactly placed according to the logo image */}
      {/* 1. Dark Blue Square nestled in the shoulder notch */}
      <rect x="63" y="29" width="6" height="6" rx="1" fill="#0F4C81" />

      {/* 2. Vibrant Cyan Square flying to the top-right */}
      <rect x="71.5" y="23" width="5.5" height="5.5" rx="1" fill="#00B8D9" />

      {/* 3. Small Cyan Square floating slightly higher */}
      <rect x="71" y="15.5" width="4" height="4" rx="0.5" fill="#00E5FF" />

      {/* Orbit swoosh (The beautiful dynamic cyan/teal ring) */}
      <path
        d="M 16 51
           C 14 56, 24 64, 43 60
           C 62 55, 75 46, 81 37
           C 71 47, 51 55, 36 55
           C 23 55, 18 51, 16 51 Z"
        fill="url(#orbitGradient)"
        filter="url(#logoShadow)"
      />

      {/* Thin secondary dark blue accent sweep below the orbit for shadow-like rotation effect */}
      <path
        d="M 19 60
           C 22 64, 30 67, 39 65
           C 31 65, 23 63, 19 60 Z"
        fill="#0F4C81"
        opacity="0.9"
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'colored', 
  showText = true, 
  className = '',
  ...props
}) => {
  // Determine standard colors for "Smile" and "ProX" parts based on theme variant
  let smileColor = 'text-[#1E293B]'; // Deep slate
  let proXColor = 'text-[#00B8D9]'; // Vibrant teal
  
  if (variant === 'light') {
    smileColor = 'text-white';
    proXColor = 'text-[#00B8D9]';
  } else if (variant === 'dark') {
    smileColor = 'text-slate-100';
    proXColor = 'text-[#00B8D9]';
  } else if (variant === 'colored') {
    smileColor = 'text-[#0F4C81]'; // Primary brand color
    proXColor = 'text-[#00B8D9]'; // Secondary brand color
  }

  // Text sizes corresponding to logo presets
  const textSizes = {
    xs: 'text-sm tracking-tight',
    sm: 'text-lg tracking-tight',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-tight',
    xl: 'text-3xl tracking-tight'
  }[typeof size === 'string' ? size : 'md'];

  // Alturas apropriadas baseadas nos tamanhos da logo
  const wrapperHeight = typeof size === 'number'
    ? size
    : {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 72
      }[size];

  const finalCompletoUrl = useStorageUrl(LOGO_COMPLETO_URL);

  // Se o usuário colou a logo completa com ÍCONE E TEXTO juntos, renderiza apenas o link da imagem
  if (finalCompletoUrl) {
    return (
      <div className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
        <img 
          src={finalCompletoUrl} 
          alt="SmileProX Logo" 
          style={{ height: wrapperHeight, width: 'auto' }}
          className="object-contain max-w-full shrink-0"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 overflow-hidden shrink-0 ${className}`}>
      <div style={{ transform: 'scale(1.6)', transformOrigin: 'left center' }}>
        <LogoIcon size={size} {...props} />
      </div>
      {showText && (
        <span 
          style={{ fontFamily: 'Neuropolitical, sans-serif', fontStyle: 'italic' }}
          className={`font-black uppercase tracking-tight select-none ${textSizes} leading-none flex items-center`}
        >
          <span style={{ color: '#10203A' }}>LAB</span>
          <span style={{ color: '#0254CC', display: 'flex' }}>
            <span>PRO</span>
            <span style={{ position: 'relative' }}>
              X
              <span style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                color: '#02B8D9',
                clipPath: 'polygon(50% 0%, 100% 0%, 100% 50%)'
              }}>X</span>
            </span>
          </span>
        </span>
      )}
    </div>
  );
};
