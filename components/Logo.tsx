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
export const LOGO_BASE64: string = 'PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB3aWR0aD0iMTAwJSIgdmlld0JveD0iMCAwIDEyNTQgMTI1NCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTI1NCAxMjU0IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHBhdGggZmlsbD0iI0ZFRkVGRSIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTI0My42NDI1NjMsNzYxLjg4MTQ3MCAKCUMyNDMuODM0ODU0LDc2Mi4xMTg0NjkgMjQ0LjA1NjYyNSw3NjIuMzIzNjY5IDI0NC42NTUwMTQsNzYzLjA4NTU3MSAKCUMyNTYuODI4MDMzLDc3Ny44OTI1NzggMjcxLjEyMzM4Myw3OTAuMjQ0MzI0IDI4Ny40NjA2MzIsODAwLjI2OTQ3MCAKCUMzMjUuOTQ2MTk4LDgyMy44ODU4NjQgMzY4LjE3ODMxNCw4MzUuMDU5MDgyIDQxMi44NjI3NjIsODM4LjA1OTg3NSAKCUM0MjQuMTIwMTQ4LDgzOC44MTU3OTYgNDI0LjEyNTc5Myw4MzguNzA3Mjc1IDQyNy42OTUyNTEsODQ5LjA0MzMzNSAKCUM0MjguNDU0NjIwLDg1MS4yNDIyNDkgNDI5LjIxNjg4OCw4NTMuNDQwMzA4IDQzMC4wMDE0OTUsODU1LjYzMDI0OSAKCUM0MzkuNzc4NDczLDg4Mi45MTg3NjIgNDUwLjgyNTk4OSw5MDkuNjI1OTc3IDQ2Ni41NzA4MzEsOTM0LjEyMjY4MSAKCUM0NzQuNjQzMDY2LDk0Ni42ODE5NDYgNDgzLjg1OTU1OCw5NTguMjg3NTM3IDQ5Ni43MjA5NzgsOTY2LjM0NjQzNiAKCUM1MTQuNzMxNjg5LDk3Ny42MzE1MzEgNTMxLjU4MTExNiw5NzMuOTUwOTI4IDU0My4zMDg4OTksOTU2LjM0MTc5NyAKCUM1NDQuNjkwMjQ3LDk1NC4yNjc2MzkgNTQ2LjIwODY3OSw5NTIuMTcwODM3IDU0Ny4wMzU0MDAsOTQ5Ljg1OTgwMiAKCUM1NTIuMDcwODAxLDkzNS43ODI5NTkgNTU3LjM3OTgyMiw5MjEuNzc5OTA3IDU2MS43MzM3MDQsOTA3LjQ4OTAxNCAKCUM1NjguNTIwNTA4LDg4NS4yMTI0NjMgNTc0LjAzMzg3NSw4NjIuNTM2NzQzIDU4MS4yMDUwMTcsODQwLjM5MjI3MyAKCUM1ODYuMzExODI5LDgyNC42MjIzMTQgNTk0LjQzMTgyNCw4MTAuMjI4MDg4IDYwNy4yNzc5NTQsNzk5LjAyNzM0NCAKCUM2MjQuOTEyNjU5LDc4My42NTEyNDUgNjQ1LjY3MTUwOSw3ODMuOTU3NzY0IDY2Mi40MDYwMDYsODAwLjIxMDg3NiAKCUM2NjUuNjA1MTY0LDgwMy4zMTgxNzYgNjY4LjQyNTc4MSw4MDYuOTExNDM4IDY3MC45NDU4NjIsODEwLjYwNDc5NyAKCUM2ODEuMTA5ODYzLDgyNS41MDEyMjEgNjg3LjM2NDgwNyw4NDIuMTgwMDU0IDY5MS45NjUzOTMsODU5LjQzOTM5MiAKCUM2OTcuOTI1NTk4LDg4MS43OTkwNzIgNzAyLjc0Mjc5OCw5MDQuNDc4MjcxIDcwOS4yMjQ3OTIsOTI2LjY3NzU1MSAKCUM3MTIuMzA5MDgyLDkzNy4yNDA3MjMgNzE3LjE2Mzc1Nyw5NDcuNTg3MjE5IDcyMi45MTA1ODMsOTU2Ljk5NzI1MyAKCUM3MzAuMjM2MjY3LDk2OC45OTI2NzYgNzQyLjAyMTk3Myw5NzMuNTkzMjAxIDc1NC4yOTU5NTksOTY5LjU3MjgxNSAKCUM3NjEuMDA1MTI3LDk2Ny4zNzUyNDQgNzY3LjU1MDY1OSw5NjMuMTI5NjM5IDc3Mi44MDA5MDMsOTU4LjMxNDY5NyAKCUM3ODkuMTEyMDYxLDk0My4zNTYwNzkgODAwLjE3OTQ0Myw5MjQuNDY0MTcyIDgwOS45NDA5NzksOTA0Ljg3MzQxMyAKCUM4MjkuMTU5NTQ2LDg2Ni4zMDMwNDAgODQzLjg3MzQxMyw4MjUuOTQ1ODAxIDg1My45NzYwNzQsNzg0LjEzOTcwOSAKCUM4NjQuMjQ5ODE3LDc0MS42MjU4NTQgODcyLjkxMDUyMiw2OTguNzE3NDY4IDg4MS45NDI1NjYsNjU1LjkxMTEzMyAKCUM4ODQuODQyNDA3LDY0Mi4xNjc3MjUgODg2LjY3NjgxOSw2MjguMTk5NTI0IDg4OS4xNTg2MzAsNjEzLjM3OTQ1NiAKCUM4ODcuMTkzNzI2LDYxNC43MTQyOTQgODg2LjA5MjEwMiw2MTUuMzk1OTk2IDg4NS4wNjE4MjksNjE2LjE3MjMwMiAKCUM4NTMuOTIyNDg1LDYzOS42MzI5MzUgODIxLjg4MzM2Miw2NjEuNzY4Njc3IDc4OC42MDg5NDgsNjgyLjExNDE5NyAKCUM3MjAuMjY2OTA3LDcyMy45MDE0ODkgNjQ4Ljc2NzE1MSw3NTguODc3ODA4IDU3MS45NDYyMjgsNzgyLjI1OTIxNiAKCUM1MTkuNjE2ODIxLDc5OC4xODYyMTggNDY2LjM2MzMxMiw4MDguNDUzNjc0IDQxMS4zMzkzODYsODA4LjE1MDk0MCAKCUMzNzQuNDE4OTE1LDgwNy45NDc4NzYgMzM4LjI5MzY0MCw4MDMuMzc5NTc4IDMwMy4yNjAxMDEsNzkxLjQyNDk4OCAKCUMyODIuNDk4NDc0LDc4NC4zNDA0NTQgMjYzLjEwNjExMCw3NzQuNTQyNTQyIDI0NS4wMzE1MjUsNzYxLjI1MjE5NyAKCUMyNDQuNzAxMTQxLDc2MS4xNTQ0ODAgMjQ0LjM3MDc0Myw3NjEuMDU2NzYzIDI0My45MzE2MTAsNzYwLjQ3MjQ3MyAKCUMyNDMuNDgzNDE0LDc2MC4xODA2NjQgMjQzLjAzNTIxNyw3NTkuODg4ODU1IDI0Mi41ODcwMDYsNzU5LjU5NzA0NiAKCUMyNDIuNDUxOTY1LDc1OS43NzQ5NjMgMjQyLjMxNjkyNSw3NTkuOTUyODgxIDI0Mi4xODE4ODUsNzYwLjEzMDc5OCAKCUMyNDIuNTk3MDYxLDc2MC41ODIwOTIgMjQzLjAxMjIzOCw3NjEuMDMzMzg2IDI0My42NDI1NjMsNzYxLjg4MTQ3MCAKTTEwMTQuMzg5NjQ4LDQ2NC44NDMwNDggCglDMTAxMi45MDY2MTYsNDY2LjE3NTUwNyAxMDExLjM1OTEzMSw0NjcuNDQzMjk4IDEwMDkuOTUwMTk1LDQ2OC44NTAwMDYgCglDOTg2LjA2Mjc0NCw0OTIuNjk5Nzk5IDk1OS45MzA5NjksNTEzLjg5MTc4NSA5MzIuNDA0NDgwLDUzMy4zMTkzOTcgCglDODUwLjY5Mzk3MCw1OTAuOTg4NzcwIDc2Mi40MTY3NDgsNjM1Ljk0ODQyNSA2NjcuOTM3ODA1LDY2OC42NzEyMDQgCglDNjAzLjY2NzQxOSw2OTAuOTMxMjEzIDUzOC4wODMyNTIsNzA3LjM4NDk0OSA0NjkuODkxMjk2LDcxMS42MTIzMDUgCglDNDM1LjIwMTMyNCw3MTMuNzYyNjk1IDQwMC42MjM1OTYsNzEzLjE1NTMzNCAzNjYuNDExMjg1LDcwNi4xMzgwNjIgCglDMzQxLjU4ODA3NCw3MDEuMDQ2NjMxIDMxNy44MTk0NTgsNjkzLjE2MzA4NiAyOTYuNzk4NDkyLDY3OC41NDAyMjIgCglDMjY2LjUxNzk0NCw2NTcuNDc2MDc0IDI1NS40NzkyOTQsNjI1Ljg2MDU5NiAyNjUuOTYwMjA1LDU5MC41MTAyNTQgCglDMjczLjA5NDgxOCw1NjYuNDQ2Mjg5IDI4Ny4xOTgwNTksNTQ2LjYyMzIzMCAzMDQuMDgwNDE0LDUyOC41MzAzOTYgCglDMzA1Ljg0MDIxMCw1MjYuNjQ0NDcwIDMwNy41NzE3MTYsNTI0LjczMjE3OCAzMDkuMzE2MzQ1LDUyMi44MzIwOTIgCglDMzA5LjA0OTY1Miw1MjIuNDYzODY3IDMwOC43ODI5NTksNTIyLjA5NTY0MiAzMDguNTE2Mjk2LDUyMS43Mjc0MTcgCglDMzA2LjQ5ODA0Nyw1MjIuNjMyODEyIDMwNC4zMzY4MjMsNTIzLjMxMTk1MSAzMDIuNDg1NTM1LDUyNC40ODE2MjggCglDMjkzLjA1NDI5MSw1MzAuNDQwNjc0IDI4My4zNzU0ODgsNTM2LjA3ODYxMyAyNzQuMzg2NTM2LDU0Mi42NTM1NjQgCglDMjQ5LjEwMTYzOSw1NjEuMTQ4MDcxIDIyNy40MDA2MzUsNTgzLjAxNzMzNCAyMTIuOTIxODYwLDYxMS4yMjgxNDkgCglDMjAyLjg5NDgzNiw2MzAuNzY1MTM3IDE5Ny4yNzcyNjcsNjUxLjE1MTkxNyAyMDEuOTM1ODIyLDY3My4zMzM4MDEgCglDMjA2LjQ0MTEzMiw2OTQuNzg2MzE2IDIxOC4yNjY4NjEsNzExLjc3NDk2MyAyMzQuNTYwNDcxLDcyNS43NzgxMzcgCglDMjU4LjY5MjU2Niw3NDYuNTE4MDA1IDI4Ny4yMjA2NzMsNzU4LjY5OTc2OCAzMTcuNjAyMjM0LDc2Ni44MjAxMjkgCglDMzY3LjYzNDUyMSw3ODAuMTkyNjg4IDQxOC40ODgyNTEsNzgwLjA0NzE4MCA0NjkuNDE3NTcyLDc3NC4zOTM3MzggCglDNTI1LjYzNjIzMCw3NjguMTUzMDc2IDU4MC4wOTg1MTEsNzUzLjgyMTI4OSA2MzMuMDc5MDQxLDczNC40MjY0NTMgCglDNzM0LjUwMDg1NCw2OTcuMjk4NTIzIDgyOS43NTY3NzUsNjQ4LjM2NTc4NCA5MTUuOTgwMTAzLDU4Mi43OTExOTkgCglDOTQ1Ljc4MjA0Myw1NjAuMTI2MjIxIDk3My42Mzg1NTAsNTM1LjM1NjY4OSA5OTUuNDU3NTIwLDUwNC41NTMzNDUgCglDMTAwNC4wNDMyNzQsNDkyLjQzMjI4MSAxMDExLjY5NDUxOSw0NzkuNzc2MTU0IDEwMTUuMjE3NzczLDQ2NC44NDg0MTkgCglDMTAxNS4xNjg1MTgsNDY0LjkyMTMyNiAxMDE1LjExOTIwMiw0NjQuOTk0MjMyIDEwMTQuMzg5NjQ4LDQ2NC44NDMwNDggCk01MTAuMTc0Nzc0LDMzNi41NTY3NjMgCglDNTEzLjI4Mjc3NiwzMzcuMTU1MTIxIDUxNi4zOTQ1MzEsMzM3LjczNDgwMiA1MTkuNDk4MjMwLDMzOC4zNTQ3MzYgCglDNTU1LjE3ODcxMSwzNDUuNDgxODEyIDU5MC42OTIxMzksMzQ2LjA1MDg0MiA2MjUuNzIzMDgzLDMzNC44OTE4MTUgCglDNjM0Ljc0NDkzNCwzMzIuMDE3OTc1IDY0My4zNzU1NDksMzI3LjkxNTc0MSA2NTIuMTg1OTEzLDMyNC4zNzc3NzcgCglDNjUxLjk5MzY1MiwzMjMuODIzNzAwIDY1MS44MDE0NTMsMzIzLjI2OTYyMyA2NTEuNjA5MTkyLDMyMi43MTU1NDYgCglDNjQ5LjM1MzA4OCwzMjIuOTQxMjU0IDY0Ny4wOTI0NjgsMzIzLjEyOTkxMyA2NDQuODQxNDkyLDMyMy4zOTg1MjkgCglDNjI1LjU0NzQyNCwzMjUuNzAwOTg5IDYwNi4zMDU2NjQsMzI0Ljc4MzkzNiA1ODguMDMzOTM2LDMxOC4zNjIxMjIgCglDNTcwLjY0OTEwOSwzMTIuMjUxOTg0IDU1My43MjA5NDcsMzA0LjY2ODY3MSA1MzcuMDI5MTE0LDI5Ni44MDUzMjggCglDNTE3LjUyNzE2MSwyODcuNjE4MTAzIDQ5Ny45NzQ0NTcsMjc5LjAyNTAyNCA0NzYuNDg0NTg5LDI3NS41MDk4MjcgCglDNDI3LjYwMzY2OCwyNjcuNTE0MTkxIDM4Mi41OTA0MjQsMjg3LjM3Njc0MCAzNTYuMzY4NTYxLDMyOS4zNTgzMzcgCglDMzM4LjI3OTcyNCwzNTguMzE4ODE3IDMzMS40OTU5NzIsMzkwLjU1NjgyNCAzMzEuMDkxMDk1LDQyNC4yNjE1MzYgCglDMzMwLjczODk4Myw0NTMuNTc2MTQxIDMzNS41NzY4NzQsNDgyLjMxODQ4MSAzNDEuODkxMzg4LDUxMC44NTAyODEgCglDMzU0LjM4MDA2Niw1NjcuMjc5Nzg1IDM3MS40NjI2MTYsNjIyLjQyOTM4MiAzODguMzY0Mjg4LDY3Ny42MjY0NjUgCglDMzg4Ljc5NDkyMiw2NzkuMDMyNzE1IDM5MC45Mzg5MDQsNjgwLjc3NjE4NCAzOTIuMzg3MjA3LDY4MC44NzY5NTMgCglDNDA4LjQ5MzE2NCw2ODEuOTk3ODY0IDQyNC42MTkwNDksNjgzLjU3NzUxNSA0NDAuNzQwNTcwLDY4My41ODk0NzggCglDNDg2LjkyMjExOSw2ODMuNjIzNzc5IDUzMi4zMTM1OTksNjc2Ljc1NjA0MiA1NzcuMjI4MDI3LDY2Ni40MDY2NzcgCglDNjQyLjYyNDg3OCw2NTEuMzM3NDYzIDcwNS42NjI4NDIsNjI5LjMzNjk3NSA3NjYuODU1NDY5LDYwMS45MDA1NzQgCglDODExLjcyNjA3NCw1ODEuNzgyMzQ5IDg1NS4zNjEyNjcsNTU5LjMyNTM3OCA4OTYuOTcwNDU5LDUzMy4wNjE4OTAgCglDODk4Ljg2Mzk1Myw1MzEuODY2Njk5IDkwMC41NDI4NDcsNTI5LjE4Mjg2MSA5MDAuOTI1MzU0LDUyNi45NTI5NDIgCglDOTAyLjE5MDczNSw1MTkuNTc2NzIxIDkwMi45OTQ5OTUsNTEyLjEwNjM4NCA5MDMuNjQ4MjU0LDUwNC42NDM0MDIgCglDOTA0Ljk4Mzc2NSw0ODkuMzg3NjY1IDkwNi45NjI2NDYsNDc0LjExOTkwNCA5MDcuMDgyMDMxLDQ1OC44NDQ2NjYgCglDOTA3LjIwODYxOCw0NDIuNjQ2ODgxIDg5Ny42OTg3OTIsNDM0LjIzMzE1NCA4ODEuNDkzNDA4LDQzNC4wNTcxOTAgCglDODcxLjMyODYxMyw0MzMuOTQ2ODA4IDg2MS4xNjAxNTYsNDM0LjEyMTYxMyA4NTAuOTk2NzY1LDQzMy45NTY3MjYgCglDODM4LjUyNzM0NCw0MzMuNzU0NDI1IDgzMC43NTgwNTcsNDI2LjQ4NTEzOCA4MjkuNzcwMzg2LDQxNC4wNDg3MDYgCglDODI5LjM0OTM2NSw0MDguNzQ2NjEzIDgyOS40Nzg1NzcsNDAzLjQwMTE1NCA4MjkuMzQ2OTI0LDM5OC4wNzU2ODQgCglDODI4LjkwNjY3NywzODAuMjY3NzMxIDgyOS40NTM5MTgsMzYyLjM2NjM2NCA4MjcuNzg1ODI4LDM0NC42NzM5ODEgCglDODI1LjI3Nzg5MywzMTguMDcyNTEwIDgwNy4yNzUzOTEsMjk3LjkyMTQ3OCA3ODEuNDM0NTcwLDI5MS4yMDgxNjAgCglDNzU3LjcwNDA0MSwyODUuMDQzMDYwIDczNC4xMTY3NjAsMjg2LjEyODU0MCA3MTIuNDA4MjY0LDI5Ny44NjQzODAgCglDNjk2LjgwOTgxNCwzMDYuMjk3MDU4IDY4Mi4zMTkzMzYsMzE2Ljg1MTg2OCA2NjcuNjcyNjA3LDMyNi45NTAzNDggCglDNjU1LjE3NDMxNiwzMzUuNTY3NTM1IDY0Mi44MjgzNjksMzQ0LjMzNzI4MCA2MjguNjkxNTg5LDM1MC4xNTA1NzQgCglDNTg2LjM5NDEwNCwzNjcuNTQ0MDA2IDU0Ni42NjcxNzUsMzYxLjE2OTkyMiA1MDkuMTAzODgyLDMzNi44OTQxMzUgCglDNTA5LjEwMzg4MiwzMzYuODk0MTM1IDUwOS4zNTUyODYsMzM2LjYyOTQ4NiA1MTAuMTc0Nzc0LDMzNi41NTY3NjMgCk05MzguMTM5MDM4LDM3MS41MDAwMDAgCglDOTM4LjE2MDQ2MSwzNjAuMzQzMjMxIDkzOC4yNDQzODUsMzQ5LjE4NjA2NiA5MzguMTc2MzkyLDMzOC4wMjk4MTYgCglDOTM4LjE0MzY3NywzMzIuNjY5NDAzIDkzNS45MTM0NTIsMzMwLjI5ODg1OSA5MzAuNTk2MTMwLDMzMC4yNzQyMzEgCglDOTEwLjc4MTAwNiwzMzAuMTgyNDk1IDg5MC45NjQ4NDQsMzMwLjE4NzIyNSA4NzEuMTQ5NzgwLDMzMC4yODkyNzYgCglDODY1LjI5NDQzNCwzMzAuMzE5NDI3IDg2Mi45NzIyMjksMzMyLjc2NDI4MiA4NjIuOTYyNDAyLDMzOC41NTE5MTAgCglDODYyLjkyODQwNiwzNTguNTMzOTY2IDg2Mi45NDUwNjgsMzc4LjUxNjI2NiA4NjMuMDA5Mjc3LDM5OC40OTgyNjAgCglDODYzLjAyNjM2Nyw0MDMuODExODI5IDg2NS4zMjEzNTAsNDA2LjE0NjMzMiA4NzAuNTkxNjc1LDQwNi4xNzIxNTAgCglDODkwLjQwNjkyMSw0MDYuMjY5MjI2IDkxMC4yMjI3NzgsNDA2LjMyMTA0NSA5MzAuMDM4MjA4LDQwNi4yOTY2MDAgCglDOTM1Ljc5OTYyMiw0MDYuMjg5NDkwIDkzOC4xMzQ4ODgsNDAzLjgxNjc0MiA5MzguMTY0Nzk1LDM5Ny45NzY5NTkgCglDOTM4LjIwODM3NCwzODkuNDg0ODk0IDkzOC4xNTE5NzgsMzgwLjk5MjM0MCA5MzguMTM5MDM4LDM3MS41MDAwMDAgCk0xMDQzLjgwMTAyNSwzOTAuNTAwMDAwIAoJQzEwNDMuODA1NjY0LDM4MC4xNzk2ODggMTA0My44NzEyMTYsMzY5Ljg1ODk0OCAxMDQzLjc5MjcyNSwzNTkuNTM5Mjc2IAoJQzEwNDMuNzQzMjg2LDM1My4wNDkwNzIgMTA0MS40MTMzMzAsMzUwLjcxOTE3NyAxMDM1LjE1MDM5MSwzNTAuNzA2MzI5IAoJQzEwMTcuMzM5NzIyLDM1MC42Njk3NjkgOTk5LjUyODgwOSwzNTAuNjU2MDM2IDk4MS43MTgxNDAsMzUwLjY4MjY0OCAKCUM5NzUuMjE5MDU1LDM1MC42OTIzNTIgOTcyLjk1NTMyMiwzNTIuOTEzODQ5IDk3Mi45MzgyOTMsMzU5LjMwNjQyNyAKCUM5NzIuODkwNjg2LDM3Ny4xMTcwMDQgOTcyLjg3ODE3NCwzOTQuOTI3Nzk1IDk3Mi45MDY2MTYsNDEyLjczODQwMyAKCUM5NzIuOTE2MTk5LDQxOC43NTE0MzQgOTc1LjMxODA1NCw0MjEuMDc0NjE1IDk4MS40NDIwNzgsNDIxLjA4MDk2MyAKCUM5OTkuMjUyODY5LDQyMS4wOTkzNjUgMTAxNy4wNjM1OTksNDIxLjA4OTQ0NyAxMDM0Ljg3NDM5MCw0MjEuMDU3MzQzIAoJQzEwNDEuNDkzNzc0LDQyMS4wNDU0MTAgMTA0My43MzU3MTgsNDE4Ljc0NjYxMyAxMDQzLjc3ODA3Niw0MTEuOTc0MDMwIAoJQzEwNDMuODIwNjc5LDQwNS4xNDk1NjcgMTA0My43OTYwMjEsMzk4LjMyNDcwNyAxMDQzLjgwMTAyNSwzOTAuNTAwMDAwIApNMTAwNi45ODI3MjcsMzA1LjAzMjg5OCAKCUMxMDExLjg0Nzk2MSwzMDQuNzQ5NzI1IDEwMTMuNTc1MDEyLDMwMS43Mjc3NTMgMTAxMy41Nzk1MjksMjk3LjMzMDU5NyAKCUMxMDEzLjU5MTMwOSwyODYuMDAxMTYwIDEwMTMuNjE5OTM0LDI3NC42NzA4OTggMTAxMy41MDE1MjYsMjYzLjM0MjQ2OCAKCUMxMDEzLjQzOTA4NywyNTcuMzcxMzk5IDEwMTEuMjEyNTg1LDI1NS4yMjQ1NjQgMTAwNS4yODY0OTksMjU1LjE5Mjc5NSAKCUM5OTQuNjIzNzE4LDI1NS4xMzU2MzUgOTgzLjk2MDE0NCwyNTUuMTM5Mzc0IDk3My4yOTczMDIsMjU1LjE5MDQ5MSAKCUM5NjcuMDg2NDI2LDI1NS4yMjAyNjEgOTY0Ljg1MjQ3OCwyNTcuNDM3MjU2IDk2NC44MTkzOTcsMjYzLjU5OTA2MCAKCUM5NjQuNzYwMzc2LDI3NC41OTUwOTMgOTY0Ljc0NjAzMywyODUuNTkxNjc1IDk2NC43OTA1MjcsMjk2LjU4NzczOCAKCUM5NjQuODE2OTU2LDMwMy4xMTk2MjkgOTY2Ljg1NjgxMiwzMDUuMDY0OTExIDk3My41OTY2ODAsMzA1LjA3OTE5MyAKCUM5ODQuNDI2MTQ3LDMwNS4xMDIxNDIgOTk1LjI1NTc5OCwzMDUuMDYwNjY5IDEwMDYuOTgyNzI3LDMwNS4wMzI4OTggCnoiLz4KPHBhdGggZmlsbD0iIzA2MkY3MCIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTUwOC44NTQ2MTQsMzM3LjE2MDc2NyAKCUM1NDYuNjY3MTc1LDM2MS4xNjk5MjIgNTg2LjM5NDEwNCwzNjcuNTQ0MDA2IDYyOC42OTE1ODksMzUwLjE1MDU3NCAKCUM2NDIuODI4MzY5LDM0NC4zMzcyODAgNjU1LjE3NDMxNiwzMzUuNTY3NTM1IDY2Ny42NzI2MDcsMzI2Ljk1MDM0OCAKCUM2ODIuMzE5MzM2LDMxNi44NTE4NjggNjk2LjgwOTgxNCwzMDYuMjk3MDU4IDcxMi40MDgyNjQsMjk3Ljg2NDM4MCAKCUM3MzQuMTE2NzYwLDI4Ni4xMjg1NDAgNzU3LjcwNDA0MSwyODUuMDQzMDYwIDc4MS40MzQ1NzAsMjkxLjIwODE2MCAKCUM4MDcuMjc1MzkxLDI5Ny45MjE0NzggODI1LjI3Nzg5MywzMTguMDcyNTEwIDgyNy43ODU4MjgsMzQ0LjY3Mzk4MSAKCUM4MjkuNDUzOTE4LDM2Mi4zNjYzNjQgODI4LjkwNjY3NywzODAuMjY3NzMxIDgyOS4zNDY5MjQsMzk4LjA3NTY4NCAKCUM4MjkuNDc4NTc3LDQwMy40MDExNTQgODI5LjM0OTM2NSw0MDguNzQ2NjEzIDgyOS43NzAzODYsNDE0LjA0ODcwNiAKCUM4MzAuNzU4MDU3LDQyNi40ODUxMzggODM4LjUyNzM0NCw0MzMuNzU0NDI1IDg1MC45OTY3NjUsNDMzLjk1NjcyNiAKCUM4NjEuMTYwMTU2LDQzNC4xMjE2MTMgODcxLjMyODYxMyw0MzMuOTQ2ODA4IDg4MS40OTM0MDgsNDM0LjA1NzE5MCAKCUM4OTcuNjk4NzkyLDQzNC4yMzMxNTQgOTA3LjIwODYxOCw0NDIuNjQ2ODgxIDkwNy4wODIwMzEsNDU4Ljg0NDY2NiAKCUM5MDYuOTYyNjQ2LDQ3NC4xMTk5MDQgOTA0Ljk4Mzc2NSw0ODkuMzg3NjY1IDkwMy42NDgyNTQsNTA0LjY0MzQwMiAKCUM5MDIuOTk0OTk1LDUxMi4xMDYzODQgOTAyLjE5MDczNSw1MTkuNTc2NzIxIDkwMC45MjUzNTQsNTI2Ljk1Mjk0MiAKCUM5MDAuNTQyODQ3LDUyOS4xODI4NjEgODk4Ljg2Mzk1Myw1MzEuODY2Njk5IDg5Ni45NzA0NTksNTMzLjA2MTg5MCAKCUM4NTUuMzYxMjY3LDU1OS4zMjUzNzggODExLjcyNjA3NCw1ODEuNzgyMzQ5IDc2Ni44NTU0NjksNjAxLjkwMDU3NCAKCUM3MDUuNjYyODQyLDYyOS4zMzY5NzUgNjQyLjYyNDg3OCw2NTEuMzM3NDYzIDU3Ny4yMjgwMjcsNjY2LjQwNjY3NyAKCUM1MzIuMzEzNTk5LDY3Ni43NTYwNDIgNDg2LjkyMjExOSw2ODMuNjIzNzc5IDQ0MC43NDA1NzAsNjgzLjU4OTQ3OCAKCUM0MjQuNjE5MDQ5LDY4My41Nzc1MTUgNDA4LjQ5MzE2NCw2ODEuOTk3ODY0IDM5Mi4zODcyMDcsNjgwLjg3Njk1MyAKCUMzOTAuOTM4OTA0LDY4MC43NzYxODQgMzg4Ljc5NDkyMiw2NzkuMDMyNzE1IDM4OC4zNjQyODgsNjc3LjYyNjQ2NSAKCUMzNzEuNDYyNjE2LDYyMi40MjkzODIgMzU0LjM4MDA2Niw1NjcuMjc5Nzg1IDM0MS44OTEzODgsNTEwLjg1MDI4MSAKCUMzMzUuNTc2ODc0LDQ4Mi4zMTg0ODEgMzMwLjczODk4Myw0NTMuNTc2MTQxIDMzMS4wOTEwOTUsNDI0LjI2MTUzNiAKCUMzMzEuNDk1OTcyLDM5MC41NTY4MjQgMzM4LjI3OTcyNCwzNTguMzE4ODE3IDM1Ni4zNjg1NjEsMzI5LjM1ODMzNyAKCUMzODIuNTkwNDI0LDI4Ny4zNzY3NDAgNDI3LjYwMzY2OCwyNjcuNTE0MTkxIDQ3Ni40ODQ1ODksMjc1LjUwOTgyNyAKCUM0OTcuOTc0NDU3LDI3OS4wMjUwMjQgNTE3LjUyNzE2MSwyODcuNjE4MTAzIDUzNy4wMjkxMTQsMjk2LjgwNTMyOCAKCUM1NTMuNzIwOTQ3LDMwNC42Njg2NzEgNTcwLjY0OTEwOSwzMTIuMjUxOTg0IDU4OC4wMzM5MzYsMzE4LjM2MjEyMiAKCUM2MDYuMzA1NjY0LDMyNC43ODM5MzYgNjI1LjU0NzQyNCwzMjUuNzAwOTg5IDY0NC44NDE0OTIsMzIzLjM5ODUyOSAKCUM2NDcuMDkyNDY4LDMyMy4xMjk5MTMgNjQ5LjM1MzA4OCwzMjIuOTQxMjU0IDY1MS42MDkxOTIsMzIyLjcxNTU0NiAKCUM2NTEuODAxNDUzLDMyMy4yNjk2MjMgNjUxLjk5MzY1MiwzMjMuODIzNzAwIDY1Mi4xODU5MTMsMzI0LjM3Nzc3NyAKCUM2NDMuMzc1NTQ5LDMyNy45MTU3NDEgNjM0Ljc0NDkzNCwzMzIuMDE3OTc1IDYyNS43MjMwODMsMzM0Ljg5MTgxNSAKCUM1OTAuNjkyMTM5LDM0Ni4wNTA4NDIgNTU1LjE3ODcxMSwzNDUuNDgxODEyIDUxOS40OTgyMzAsMzM4LjM1NDczNiAKCUM1MTYuMzk0NTMxLDMzNy43MzQ4MDIgNTEzLjI4Mjc3NiwzMzcuMTU1MTIxIDUwOS41OTU3OTUsMzM2LjQwNTA5MCAKCUM1MDguNTU5MDUyLDMzNi4zMjk4OTUgNTA4LjEwMTMxOCwzMzYuNDA2MzcyIDUwNy42NDM1NTUsMzM2LjQ4Mjg0OSAKCUM1MDguMDQ3MjQxLDMzNi43MDg4MzIgNTA4LjQ1MDkyOCwzMzYuOTM0Nzg0IDUwOC44NTQ2MTQsMzM3LjE2MDc2NyAKeiIvPgo8cGF0aCBmaWxsPSIjMDczMDcwIiBvcGFjaXR5PSIxLjAwMDAwMCIgc3Ryb2tlPSJub25lIiAKCWQ9IgpNMjQ1LjI1ODU5MSw3NjEuNzQ0NTY4IAoJQzI2My4xMDYxMTAsNzc0LjU0MjU0MiAyODIuNDk4NDc0LDc4NC4zNDA0NTQgMzAzLjI2MDEwMSw3OTEuNDI0OTg4IAoJQzMzOC4yOTM2NDAsODAzLjM3OTU3OCAzNzQuNDE4OTE1LDgwNy45NDc4NzYgNDExLjMzOTM4Niw4MDguMTUwOTQwIAoJQzQ2Ni4zNjMzMTIsODA4LjQ1MzY3NCA1MTkuNjE2ODIxLDc5OC4xODYyMTggNTcxLjk0NjIyOCw3ODIuMjU5MjE2IAoJQzY0OC43NjcxNTEsNzU4Ljg3NzgwOCA3MjAuMjY2OTA3LDcyMy45MDE0ODkgNzg4LjYwODk0OCw2ODIuMTE0MTk3IAoJQzgyMS44ODMzNjIsNjYxLjc2ODY3NyA4NTMuOTIyNDg1LDYzOS42MzI5MzUgODg1LjA2MTgyOSw2MTYuMTcyMzAyIAoJQzg4Ni4wOTIxMDIsNjE1LjM5NTk5NiA4ODcuMTkzNzI2LDYxNC43MTQyOTQgODg5LjE1ODYzMCw2MTMuMzc5NDU2IAoJQzg4Ni42NzY4MTksNjI4LjE5OTUyNCA4ODQuODQyNDA3LDY0Mi4xNjc3MjUgODgxLjk0MjU2Niw2NTUuOTExMTMzIAoJQzg3Mi45MTA1MjIsNjk4LjcxNzQ2OCA4NjQuMjQ5ODE3LDc0MS42MjU4NTQgODUzLjk3NjA3NCw3ODQuMTM5NzA5IAoJQzg0My44NzM0MTMsODI1Ljk0NTgwMSA4MjkuMTU5NTQ2LDg2Ni4zMDMwNDAgODA5Ljk0MDk3OSw5MDQuODczNDEzIAoJQzgwMC4xNzk0NDMsOTI0LjQ2NDE3MiA3ODkuMTEyMDYxLDk0My4zNTYwNzkgNzcyLjgwMDkwMyw5NTguMzE0Njk3IAoJQzc2Ny41NTA2NTksOTYzLjEyOTYzOSA3NjEuMDA1MTI3LDk2Ny4zNzUyNDQgNzU0LjI5NTk1OSw5NjkuNTcyODE1IAoJQzc0Mi4wMjE5NzMsOTczLjU5MzIwMSA3MzAuMjM2MjY3LDk2OC45OTI2NzYgNzIyLjkxMDU4Myw5NTYuOTk3MjUzIAoJQzcxNy4xNjM3NTcsOTQ3LjU4NzIxOSA3MTIuMzA5MDgyLDkzNy4yNDA3MjMgNzA5LjIyNDc5Miw5MjYuNjc3NTUxIAoJQzcwMi43NDI3OTgsOTA0LjQ3ODI3MSA2OTcuOTI1NTk4LDg4MS43OTkwNzIgNjkxLjk2NTM5Myw4NTkuNDM5MzkyIAoJQzY4Ny4zNjQ4MDcsODQyLjE4MDA1NCA2ODEuMTA5ODYzLDgyNS41MDEyMjEgNjcwLjk0NTg2Miw4MTAuNjA0Nzk3IAoJQzY2OC40MjU3ODEsODA2LjkxMTQzOCA2NjUuNjA1MTY0LDgwMy4zMTgxNzYgNjYyLjQwNjAwNiw4MDAuMjEwODc2IAoJQzY0NS42NzE1MDksNzgzLjk1Nzc2NCA2MjQuOTEyNjU5LDc4My42NTEyNDUgNjA3LjI3Nzk1NCw3OTkuMDI3MzQ0IAoJQzU5NC40MzE4MjQsODEwLjIyODA4OCA1ODYuMzExODI5LDgyNC42MjIzMTQgNTgxLjIwNTAxNyw4NDAuMzkyMjczIAoJQzU3NC4wMzM4NzUsODYyLjUzNjc0MyA1NjguNTIwNTA4LDg4NS4yMTI0NjMgNTYxLjczMzcwNCw5MDcuNDg5MDE0IAoJQzU1Ny4zNzk4MjIsOTIxLjc3OTkwNyA1NTIuMDcwODAxLDkzNS43ODI5NTkgNTQ3LjAzNTQwMCw5NDkuODU5ODAyIAoJQzU0Ni4yMDg2NzksOTUyLjE3MDgzNyA1NDQuNjkwMjQ3LDk1NC4yNjc2MzkgNTQzLjMwODg5OSw5NTYuMzQxNzk3IAoJQzUzMS41ODExMTYsOTczLjk1MDkyOCA1MTQuNzMxNjg5LDk3Ny42MzE1MzEgNDk2LjcyMDk3OCw5NjYuMzQ2NDM2IAoJQzQ4My44NTk1NTgsOTU4LjI4NzUzNyA0NzQuNjQzMDY2LDk0Ni42ODE5NDYgNDY2LjU3MDgzMSw5MzQuMTIyNjgxIAoJQzQ1MC44MjU5ODksOTA5LjYyNTk3NyA0MzkuNzc4NDczLDg4Mi45MTg3NjIgNDMwLjAwMTQ5NSw4NTUuNjMwMjQ5IAoJQzQyOS4yMTY4ODgsODUzLjQ0MDMwOCA0MjguNDU0NjIwLDg1MS4yNDIyNDkgNDI3LjY5NTI1MSw4NDkuMDQzMzM1IAoJQzQyNC4xMjU3OTMsODM4LjcwNzI3NSA0MjQuMTIwMTQ4LDgzOC44MTU3OTYgNDEyLjg2Mjc2Miw4MzguMDU5ODc1IAoJQzM2OC4xNzgzMTQsODM1LjA1OTA4MiAzMjUuOTQ2MTk4LDgyMy44ODU4NjQgMjg3LjQ2MDYzMiw4MDAuMjY5NDcwIAoJQzI3MS4xMjMzODMsNzkwLjI0NDMyNCAyNTYuODI4MDMzLDc3Ny44OTI1NzggMjQ0LjcyNjE5Niw3NjIuNjEyMTgzIAoJQzI0NC45NTExMTEsNzYyLjAwNzMyNCAyNDUuMTA0ODQzLDc2MS44NzU5NzcgMjQ1LjI1ODU5MSw3NjEuNzQ0NTY4IAp6Ii8+CjxwYXRoIGZpbGw9IiMwNEJBQzIiIG9wYWNpdHk9IjEuMDAwMDAwIiBzdHJva2U9Im5vbmUiIAoJZD0iCk0xMDE0Ljk4NTU5Niw0NjUuMDA1NjE1IAoJQzEwMTEuNjk0NTE5LDQ3OS43NzYxNTQgMTAwNC4wNDMyNzQsNDkyLjQzMjI4MSA5OTUuNDU3NTIwLDUwNC41NTMzNDUgCglDOTczLjYzODU1MCw1MzUuMzU2Njg5IDk0NS43ODIwNDMsNTYwLjEyNjIyMSA5MTUuOTgwMTAzLDU4Mi43OTExOTkgCglDODI5Ljc1Njc3NSw2NDguMzY1Nzg0IDczNC41MDA4NTQsNjk3LjI5ODUyMyA2MzMuMDc5MDQxLDczNC40MjY0NTMgCglDNTgwLjA5ODUxMSw3NTMuODIxMjg5IDUyNS42MzYyMzAsNzY4LjE1MzA3NiA0NjkuNDE3NTcyLDc3NC4zOTM3MzggCglDNDE4LjQ4ODI1MSw3ODAuMDQ3MTgwIDM2Ny42MzQ1MjEsNzgwLjE5MjY4OCAzMTcuNjAyMjM0LDc2Ni44MjAxMjkgCglDMjg3LjIyMDY3Myw3NTguNjk5NzY4IDI1OC42OTI1NjYsNzQ2LjUxODAwNSAyMzQuNTYwNDcxLDcyNS43NzgxMzcgCglDMjE4LjI2Njg2MSw3MTEuNzc0OTYzIDIwNi40NDExMzIsNjk0Ljc4NjMxNiAyMDEuOTM1ODIyLDY3My4zMzM4MDEgCglDMTk3LjI3NzI2Nyw2NTEuMTUxOTE3IDIwMi44OTQ4MzYsNjMwLjc2NTEzNyAyMTIuOTIxODYwLDYxMS4yMjgxNDkgCglDMjI3LjQwMDYzNSw1ODMuMDE3MzM0IDI0OS4xMDE2MzksNTYxLjE0ODA3MSAyNzQuMzg2NTM2LDU0Mi42NTM1NjQgCglDMjgzLjM3NTQ4OCw1MzYuMDc4NjEzIDI5My4wNTQyOTEsNTMwLjQ0MDY3NCAzMDIuNDg1NTM1LDUyNC40ODE2MjggCglDMzA0LjMzNjgyMyw1MjMuMzExOTUxIDMwNi40OTgwNDcsNTIyLjYzMjgxMiAzMDguNTE2Mjk2LDUyMS43Mjc0MTcgCglDMzA4Ljc4Mjk1OSw1MjIuMDk1NjQyIDMwOS4wNDk2NTIsNTIyLjQ2Mzg2NyAzMDkuMzE2MzQ1LDUyMi44MzIwOTIgCglDMzA3LjU3MTcxNiw1MjQuNzMyMTc4IDMwNS44NDAyMTAsNTI2LjY0NDQ3MCAzMDQuMDgwNDE0LDUyOC41MzAzOTYgCglDMjg3LjE5ODA1OSw1NDYuNjIzMjMwIDI3My4wOTQ4MTgsNTY2LjQ0NjI4OSAyNjUuOTYwMjA1LDU5MC41MTAyNTQgCglDMjU1LjQ3OTI5NCw2MjUuODYwNTk2IDI2Ni41MTc5NDQsNjU3LjQ3NjA3NCAyOTYuNzk4NDkyLDY3OC41NDAyMjIgCglDMzE3LjgxOTQ1OCw2OTMuMTYzMDg2IDM0MS41ODgwNzQsNzAxLjA0NjYzMSAzNjYuNDExMjg1LDcwNi4xMzgwNjIgCglDNDAwLjYyMzU5Niw3MTMuMTU1MzM0IDQzNS4yMDEzMjQsNzEzLjc2MjY5NSA0NjkuODkxMjk2LDcxMS42MTIzMDUgCglDNTM4LjA4MzI1Miw3MDcuMzg0OTQ5IDYwMy42Njc0MTksNjkwLjkzMTIxMyA2NjcuOTM3ODA1LDY2OC42NzEyMDQgCglDNzYyLjQxNjc0OCw2MzUuOTQ4NDI1IDg1MC42OTM5NzAsNTkwLjk4ODc3MCA5MzIuNDA0NDgwLDUzMy4zMTkzOTcgCglDOTU5LjkzMDk2OSw1MTMuODkxNzg1IDk4Ni4wNjI3NDQsNDkyLjY5OTc5OSAxMDA5Ljk1MDE5NSw0NjguODUwMDA2IAoJQzEwMTEuMzU5MTMxLDQ2Ny40NDMyOTggMTAxMi45MDY2MTYsNDY2LjE3NTUwNyAxMDE0LjcwOTk2MSw0NjQuOTM4MDQ5IAoJQzEwMTUuMDMwMjEyLDQ2NS4wMzMwMjAgMTAxNC45ODU1OTYsNDY1LjAwNTYxNSAxMDE0Ljk4NTU5Niw0NjUuMDA1NjE1IAp6Ii8+CjxwYXRoIGZpbGw9IiMwODMwNzAiIG9wYWNpdHk9IjEuMDAwMDAwIiBzdHJva2U9Im5vbmUiIAoJZD0iCk05MzguMTM4NjcyLDM3Mi4wMDAwMDAgCglDOTM4LjE1MTk3OCwzODAuOTkyMzQwIDkzOC4yMDgzNzQsMzg5LjQ4NDg5NCA5MzguMTY0Nzk1LDM5Ny45NzY5NTkgCglDOTM4LjEzNDg4OCw0MDMuODE2NzQyIDkzNS43OTk2MjIsNDA2LjI4OTQ5MCA5MzAuMDM4MjA4LDQwNi4yOTY2MDAgCglDOTEwLjIyMjc3OCw0MDYuMzIxMDQ1IDg5MC40MDY5MjEsNDA2LjI2OTIyNiA4NzAuNTkxNjc1LDQwNi4xNzIxNTAgCglDODY1LjMyMTM1MCw0MDYuMTQ2MzMyIDg2My4wMjYzNjcsNDAzLjgxMTgyOSA4NjMuMDA5Mjc3LDM5OC40OTgyNjAgCglDODYyLjk0NTA2OCwzNzguNTE2MjY2IDg2Mi45Mjg0MDYsMzU4LjUzMzk2NiA4NjIuOTYyNDAyLDMzOC41NTE5MTAgCglDODYyLjk3MjIyOSwzMzIuNzY0MjgyIDg2NS4yOTQ0MzQsMzMwLjMxOTQyNyA4NzEuMTQ5NzgwLDMzMC4yODkyNzYgCglDODkwLjk2NDg0NCwzMzAuMTg3MjI1IDkxMC43ODEwMDYsMzMwLjE4MjQ5NSA5MzAuNTk2MTMwLDMzMC4yNzQyMzEgCglDOTM1LjkxMzQ1MiwzMzAuMjk4ODU5IDkzOC4xNDM2NzcsMzMyLjY2OTQwMyA5MzguMTc2MzkyLDMzOC4wMjk4MTYgCglDOTM4LjI0NDM4NSwzNDkuMTg2MDY2IDkzOC4xNjA0NjEsMzYwLjM0MzIzMSA5MzguMTM4NjcyLDM3Mi4wMDAwMDAgCnoiLz4KPHBhdGggZmlsbD0iIzA0QkJDMyIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTEwNDMuODAwOTAzLDM5MS4wMDAwMDAgCglDMTA0My43OTYwMjEsMzk4LjMyNDcwNyAxMDQzLjgyMDY3OSw0MDUuMTQ5NTY3IDEwNDMuNzc4MDc2LDQxMS45NzQwMzAgCglDMTA0My43MzU3MTgsNDE4Ljc0NjYxMyAxMDQxLjQ5Mzc3NCw0MjEuMDQ1NDEwIDEwMzQuODc0MzkwLDQyMS4wNTczNDMgCglDMTAxNy4wNjM1OTksNDIxLjA4OTQ0NyA5OTkuMjUyODY5LDQyMS4wOTkzNjUgOTgxLjQ0MjA3OCw0MjEuMDgwOTYzIAoJQzk3NS4zMTgwNTQsNDIxLjA3NDYxNSA5NzIuOTE2MTk5LDQxOC43NTE0MzQgOTcyLjkwNjYxNiw0MTIuNzM4NDAzIAoJQzk3Mi44NzgxNzQsMzk0LjkyNzc5NSA5NzIuODkwNjg2LDM3Ny4xMTcwMDQgOTcyLjkzODI5MywzNTkuMzA2NDI3IAoJQzk3Mi45NTUzMjIsMzUyLjkxMzg0OSA5NzUuMjE5MDU1LDM1MC42OTIzNTIgOTgxLjcxODE0MCwzNTAuNjgyNjQ4IAoJQzk5OS41Mjg4MDksMzUwLjY1NjAzNiAxMDE3LjMzOTcyMiwzNTAuNjY5NzY5IDEwMzUuMTUwMzkxLDM1MC43MDYzMjkgCglDMTA0MS40MTMzMzAsMzUwLjcxOTE3NyAxMDQzLjc0MzI4NiwzNTMuMDQ5MDcyIDEwNDMuNzkyNzI1LDM1OS41MzkyNzYgCglDMTA0My44NzEyMTYsMzY5Ljg1ODk0OCAxMDQzLjgwNTY2NCwzODAuMTc5Njg4IDEwNDMuODAwOTAzLDM5MS4wMDAwMDAgCnoiLz4KPHBhdGggZmlsbD0iIzA1QkJDMyIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTEwMDYuNTM0MDU4LDMwNS4wMzk2NzMgCglDOTk1LjI1NTc5OCwzMDUuMDYwNjY5IDk4NC40MjYxNDcsMzA1LjEwMjE0MiA5NzMuNTk2NjgwLDMwNS4wNzkxOTMgCglDOTY2Ljg1NjgxMiwzMDUuMDY0OTExIDk2NC44MTY5NTYsMzAzLjExOTYyOSA5NjQuNzkwNTI3LDI5Ni41ODc3MzggCglDOTY0Ljc0NjAzMywyODUuNTkxNjc1IDk2NC43NjAzNzYsMjc0LjU5NTA5MyA5NjQuODE5Mzk3LDI2My41OTkwNjAgCglDOTY0Ljg1MjQ3OCwyNTcuNDM3MjU2IDk2Ny4wODY0MjYsMjU1LjIyMDI2MSA5NzMuMjk3MzAyLDI1NS4xOTA0OTEgCglDOTgzLjk2MDE0NCwyNTUuMTM5Mzc0IDk5NC42MjM3MTgsMjU1LjEzNTYzNSAxMDA1LjI4NjQ5OSwyNTUuMTkyNzk1IAoJQzEwMTEuMjEyNTg1LDI1NS4yMjQ1NjQgMTAxMy40MzkwODcsMjU3LjM3MTM5OSAxMDEzLjUwMTUyNiwyNjMuMzQyNDY4IAoJQzEwMTMuNjE5OTM0LDI3NC42NzA4OTggMTAxMy41OTEzMDksMjg2LjAwMTE2MCAxMDEzLjU3OTUyOSwyOTcuMzMwNTk3IAoJQzEwMTMuNTc1MDEyLDMwMS43Mjc3NTMgMTAxMS44NDc5NjEsMzA0Ljc0OTcyNSAxMDA2LjUzNDA1OCwzMDUuMDM5NjczIAp6Ii8+CjxwYXRoIGZpbGw9IiMwNzMwNzAiIG9wYWNpdHk9IjEuMDAwMDAwIiBzdHJva2U9Im5vbmUiIAoJZD0iCk0yNDMuNDI3NDE0LDc2MS40ODQ2ODAgCglDMjQzLjAxMjIzOCw3NjEuMDMzMzg2IDI0Mi41OTcwNjEsNzYwLjU4MjA5MiAyNDIuMTgxODg1LDc2MC4xMzA3OTggCglDMjQyLjMxNjkyNSw3NTkuOTUyODgxIDI0Mi40NTE5NjUsNzU5Ljc3NDk2MyAyNDIuNTg3MDA2LDc1OS41OTcwNDYgCglDMjQzLjAzNTIxNyw3NTkuODg4ODU1IDI0My40ODM0MTQsNzYwLjE4MDY2NCAyNDMuODMxNzI2LDc2MC44NDU5NDcgCglDMjQzLjczMTg0Miw3NjEuMjE5NDgyIDI0My40Mjc0MTQsNzYxLjQ4NDY4MCAyNDMuNDI3NDE0LDc2MS40ODQ2ODAgCnoiLz4KPHBhdGggZmlsbD0iIzA0QkFDMiIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTEwMTUuMDUwMDQ5LDQ2NS4wNTAwNzkgCglDMTAxNS4xMTkyMDIsNDY0Ljk5NDIzMiAxMDE1LjE2ODUxOCw0NjQuOTIxMzI2IDEwMTUuMTAxNjg1LDQ2NC45MjcwMDIgCglDMTAxNC45ODU1OTYsNDY1LjAwNTYxNSAxMDE1LjAzMDIxMiw0NjUuMDMzMDIwIDEwMTUuMDUwMDQ5LDQ2NS4wNTAwNzkgCnoiLz4KPHBhdGggZmlsbD0iIzA3MzA3MCIgb3BhY2l0eT0iMS4wMDAwMDAiIHN0cm9rZT0ibm9uZSIgCglkPSIKTTI0NC41NTI2NDMsNzYyLjMxNzg3MSAKCUMyNDQuMDU2NjI1LDc2Mi4zMjM2NjkgMjQzLjgzNDg1NCw3NjIuMTE4NDY5IDI0My41MzQ5ODgsNzYxLjY4MzEwNSAKCUMyNDMuNDI3NDE0LDc2MS40ODQ2ODAgMjQzLjczMTg0Miw3NjEuMjE5NDgyIDI0My44ODYxMDgsNzYxLjA4OTIzMyAKCUMyNDQuMzcwNzQzLDc2MS4wNTY3NjMgMjQ0LjcwMTE0MSw3NjEuMTU0NDgwIDI0NS4xNDUwNTAsNzYxLjQ5ODQxMyAKCUMyNDUuMTA0ODQzLDc2MS44NzU5NzcgMjQ0Ljk1MTExMSw3NjIuMDA3MzI0IDI0NC41NTI2NDMsNzYyLjMxNzg3MSAKeiIvPgo8cGF0aCBmaWxsPSIjRkVGRUZFIiBvcGFjaXR5PSIxLjAwMDAwMCIgc3Ryb2tlPSJub25lIiAKCWQ9IgpNNTA4Ljk3OTI0OCwzMzcuMDI3NDY2IAoJQzUwOC40NTA5MjgsMzM2LjkzNDc4NCA1MDguMDQ3MjQxLDMzNi43MDg4MzIgNTA3LjY0MzU1NSwzMzYuNDgyODQ5IAoJQzUwOC4xMDEzMTgsMzM2LjQwNjM3MiA1MDguNTU5MDUyLDMzNi4zMjk4OTUgNTA5LjE4NjAzNSwzMzYuNDQxNDY3IAoJQzUwOS4zNTUyODYsMzM2LjYyOTQ4NiA1MDkuMTAzODgyLDMzNi44OTQxMzUgNTA4Ljk3OTI0OCwzMzcuMDI3NDY2IAp6Ii8+Cjwvc3ZnPg=='; // Ex: 'data:image/svg+xml;base64,PHN2Z...'

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
    <div className={`flex items-center gap-2.5 overflow-hidden shrink-0 ${className}`}>
      <LogoIcon size={size} {...props} />
      {showText && (
        <span className={`font-black font-display uppercase tracking-tight select-none ${textSizes} leading-none flex items-center`}>
          <span className={smileColor}>Smile</span>
          <span className={proXColor}>ProX</span>
        </span>
      )}
    </div>
  );
};
