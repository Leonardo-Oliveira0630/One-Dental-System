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
export const LOGO_SVG_RAW: string = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 width="100%" viewBox="0 0 1254 1254" enable-background="new 0 0 1254 1254" xml:space="preserve">
<path fill="#FEFEFE" opacity="1.000000" stroke="none" 
	d="
M824.000000,1255.000000 
	C549.333313,1255.000000 275.166656,1255.000000 1.000000,1255.000000 
	C1.000000,837.000000 1.000000,419.000000 1.000000,1.000000 
	C419.000000,1.000000 837.000000,1.000000 1255.000000,1.000000 
	C1255.000000,419.000000 1255.000000,837.000000 1255.000000,1255.000000 
	C1111.500000,1255.000000 968.000000,1255.000000 824.000000,1255.000000 
M243.642563,761.881470 
	C243.834854,762.118469 244.056625,762.323669 244.655014,763.085571 
	C256.828033,777.892578 271.123383,790.244324 287.460632,800.269470 
	C325.946198,823.885864 368.178314,835.059082 412.862762,838.059875 
	C424.120148,838.815796 424.125793,838.707275 427.695251,849.043335 
	C428.454620,851.242249 429.216888,853.440308 430.001495,855.630249 
	C439.778473,882.918762 450.825989,909.625977 466.570831,934.122681 
	C474.643066,946.681946 483.859558,958.287537 496.720978,966.346436 
	C514.731689,977.631531 531.581116,973.950928 543.308899,956.341797 
	C544.690247,954.267639 546.208679,952.170837 547.035400,949.859802 
	C552.070801,935.782959 557.379822,921.779907 561.733704,907.489014 
	C568.520508,885.212463 574.033875,862.536743 581.205017,840.392273 
	C586.311829,824.622314 594.431824,810.228088 607.277954,799.027344 
	C624.912659,783.651245 645.671509,783.957764 662.406006,800.210876 
	C665.605164,803.318176 668.425781,806.911438 670.945862,810.604797 
	C681.109863,825.501221 687.364807,842.180054 691.965393,859.439392 
	C697.925598,881.799072 702.742798,904.478271 709.224792,926.677551 
	C712.309082,937.240723 717.163757,947.587219 722.910583,956.997253 
	C730.236267,968.992676 742.021973,973.593201 754.295959,969.572815 
	C761.005127,967.375244 767.550659,963.129639 772.800903,958.314697 
	C789.112061,943.356079 800.179443,924.464172 809.940979,904.873413 
	C829.159546,866.303040 843.873413,825.945801 853.976074,784.139709 
	C864.249817,741.625854 872.910522,698.717468 881.942566,655.911133 
	C884.842407,642.167725 886.676819,628.199524 889.158630,613.379456 
	C887.193726,614.714294 886.092102,615.395996 885.061829,616.172302 
	C853.922485,639.632935 821.883362,661.768677 788.608948,682.114197 
	C720.266907,723.901489 648.767151,758.877808 571.946228,782.259216 
	C519.616821,798.186218 466.363312,808.453674 411.339386,808.150940 
	C374.418915,807.947876 338.293640,803.379578 303.260101,791.424988 
	C282.498474,784.340454 263.106110,774.542542 245.031525,761.252197 
	C244.701141,761.154480 244.370743,761.056763 243.931610,760.472473 
	C243.483414,760.180664 243.035217,759.888855 242.587006,759.597046 
	C242.451965,759.774963 242.316925,759.952881 242.181885,760.130798 
	C242.597061,760.582092 243.012238,761.033386 243.642563,761.881470 
M1014.389648,464.843048 
	C1012.906616,466.175507 1011.359131,467.443298 1009.950195,468.850006 
	C986.062744,492.699799 959.930969,513.891785 932.404480,533.319397 
	C850.693970,590.988770 762.416748,635.948425 667.937805,668.671204 
	C603.667419,690.931213 538.083252,707.384949 469.891296,711.612305 
	C435.201324,713.762695 400.623596,713.155334 366.411285,706.138062 
	C341.588074,701.046631 317.819458,693.163086 296.798492,678.540222 
	C266.517944,657.476074 255.479294,625.860596 265.960205,590.510254 
	C273.094818,566.446289 287.198059,546.623230 304.080414,528.530396 
	C305.840210,526.644470 307.571716,524.732178 309.316345,522.832092 
	C309.049652,522.463867 308.782959,522.095642 308.516296,521.727417 
	C306.498047,522.632812 304.336823,523.311951 302.485535,524.481628 
	C293.054291,530.440674 283.375488,536.078613 274.386536,542.653564 
	C249.101639,561.148071 227.400635,583.017334 212.921860,611.228149 
	C202.894836,630.765137 197.277267,651.151917 201.935822,673.333801 
	C206.441132,694.786316 218.266861,711.774963 234.560471,725.778137 
	C258.692566,746.518005 287.220673,758.699768 317.602234,766.820129 
	C367.634521,780.192688 418.488251,780.047180 469.417572,774.393738 
	C525.636230,768.153076 580.098511,753.821289 633.079041,734.426453 
	C734.500854,697.298523 829.756775,648.365784 915.980103,582.791199 
	C945.782043,560.126221 973.638550,535.356689 995.457520,504.553345 
	C1004.043274,492.432281 1011.694519,479.776154 1015.217773,464.848419 
	C1015.168518,464.921326 1015.119202,464.994232 1014.389648,464.843048 
M510.174774,336.556763 
	C513.282776,337.155121 516.394531,337.734802 519.498230,338.354736 
	C555.178711,345.481812 590.692139,346.050842 625.723083,334.891815 
	C634.744934,332.017975 643.375549,327.915741 652.185913,324.377777 
	C651.993652,323.823700 651.801453,323.269623 651.609192,322.715546 
	C649.353088,322.941254 647.092468,323.129913 644.841492,323.398529 
	C625.547424,325.700989 606.305664,324.783936 588.033936,318.362122 
	C570.649109,312.251984 553.720947,304.668671 537.029114,296.805328 
	C517.527161,287.618103 497.974457,279.025024 476.484589,275.509827 
	C427.603668,267.514191 382.590424,287.376740 356.368561,329.358337 
	C338.279724,358.318817 331.495972,390.556824 331.091095,424.261536 
	C330.738983,453.576141 335.576874,482.318481 341.891388,510.850281 
	C354.380066,567.279785 371.462616,622.429382 388.364288,677.626465 
	C388.794922,679.032715 390.938904,680.776184 392.387207,680.876953 
	C408.493164,681.997864 424.619049,683.577515 440.740570,683.589478 
	C486.922119,683.623779 532.313599,676.756042 577.228027,666.406677 
	C642.624878,651.337463 705.662842,629.336975 766.855469,601.900574 
	C811.726074,581.782349 855.361267,559.325378 896.970459,533.061890 
	C898.863953,531.866699 900.542847,529.182861 900.925354,526.952942 
	C902.190735,519.576721 902.994995,512.106384 903.648254,504.643402 
	C904.983765,489.387665 906.962646,474.119904 907.082031,458.844666 
	C907.208618,442.646881 897.698792,434.233154 881.493408,434.057190 
	C871.328613,433.946808 861.160156,434.121613 850.996765,433.956726 
	C838.527344,433.754425 830.758057,426.485138 829.770386,414.048706 
	C829.349365,408.746613 829.478577,403.401154 829.346924,398.075684 
	C828.906677,380.267731 829.453918,362.366364 827.785828,344.673981 
	C825.277893,318.072510 807.275391,297.921478 781.434570,291.208160 
	C757.704041,285.043060 734.116760,286.128540 712.408264,297.864380 
	C696.809814,306.297058 682.319336,316.851868 667.672607,326.950348 
	C655.174316,335.567535 642.828369,344.337280 628.691589,350.150574 
	C586.394104,367.544006 546.667175,361.169922 509.103882,336.894135 
	C509.103882,336.894135 509.355286,336.629486 510.174774,336.556763 
M938.139038,371.500000 
	C938.160461,360.343231 938.244385,349.186066 938.176392,338.029816 
	C938.143677,332.669403 935.913452,330.298859 930.596130,330.274231 
	C910.781006,330.182495 890.964844,330.187225 871.149780,330.289276 
	C865.294434,330.319427 862.972229,332.764282 862.962402,338.551910 
	C862.928406,358.533966 862.945068,378.516266 863.009277,398.498260 
	C863.026367,403.811829 865.321350,406.146332 870.591675,406.172150 
	C890.406921,406.269226 910.222778,406.321045 930.038208,406.296600 
	C935.799622,406.289490 938.134888,403.816742 938.164795,397.976959 
	C938.208374,389.484894 938.151978,380.992340 938.139038,371.500000 
M1043.801025,390.500000 
	C1043.805664,380.179688 1043.871216,369.858948 1043.792725,359.539276 
	C1043.743286,353.049072 1041.413330,350.719177 1035.150391,350.706329 
	C1017.339722,350.669769 999.528809,350.656036 981.718140,350.682648 
	C975.219055,350.692352 972.955322,352.913849 972.938293,359.306427 
	C972.890686,377.117004 972.878174,394.927795 972.906616,412.738403 
	C972.916199,418.751434 975.318054,421.074615 981.442078,421.080963 
	C999.252869,421.099365 1017.063599,421.089447 1034.874390,421.057343 
	C1041.493774,421.045410 1043.735718,418.746613 1043.778076,411.974030 
	C1043.820679,405.149567 1043.796021,398.324707 1043.801025,390.500000 
M1006.982727,305.032898 
	C1011.847961,304.749725 1013.575012,301.727753 1013.579529,297.330597 
	C1013.591309,286.001160 1013.619934,274.670898 1013.501526,263.342468 
	C1013.439087,257.371399 1011.212585,255.224564 1005.286499,255.192795 
	C994.623718,255.135635 983.960144,255.139374 973.297302,255.190491 
	C967.086426,255.220261 964.852478,257.437256 964.819397,263.599060 
	C964.760376,274.595093 964.746033,285.591675 964.790527,296.587738 
	C964.816956,303.119629 966.856812,305.064911 973.596680,305.079193 
	C984.426147,305.102142 995.255798,305.060669 1006.982727,305.032898 
z"/>
<path fill="#062F70" opacity="1.000000" stroke="none" 
	d="
M508.854614,337.160767 
	C546.667175,361.169922 586.394104,367.544006 628.691589,350.150574 
	C642.828369,344.337280 655.174316,335.567535 667.672607,326.950348 
	C682.319336,316.851868 696.809814,306.297058 712.408264,297.864380 
	C734.116760,286.128540 757.704041,285.043060 781.434570,291.208160 
	C807.275391,297.921478 825.277893,318.072510 827.785828,344.673981 
	C829.453918,362.366364 828.906677,380.267731 829.346924,398.075684 
	C829.478577,403.401154 829.349365,408.746613 829.770386,414.048706 
	C830.758057,426.485138 838.527344,433.754425 850.996765,433.956726 
	C861.160156,434.121613 871.328613,433.946808 881.493408,434.057190 
	C897.698792,434.233154 907.208618,442.646881 907.082031,458.844666 
	C906.962646,474.119904 904.983765,489.387665 903.648254,504.643402 
	C902.994995,512.106384 902.190735,519.576721 900.925354,526.952942 
	C900.542847,529.182861 898.863953,531.866699 896.970459,533.061890 
	C855.361267,559.325378 811.726074,581.782349 766.855469,601.900574 
	C705.662842,629.336975 642.624878,651.337463 577.228027,666.406677 
	C532.313599,676.756042 486.922119,683.623779 440.740570,683.589478 
	C424.619049,683.577515 408.493164,681.997864 392.387207,680.876953 
	C390.938904,680.776184 388.794922,679.032715 388.364288,677.626465 
	C371.462616,622.429382 354.380066,567.279785 341.891388,510.850281 
	C335.576874,482.318481 330.738983,453.576141 331.091095,424.261536 
	C331.495972,390.556824 338.279724,358.318817 356.368561,329.358337 
	C382.590424,287.376740 427.603668,267.514191 476.484589,275.509827 
	C497.974457,279.025024 517.527161,287.618103 537.029114,296.805328 
	C553.720947,304.668671 570.649109,312.251984 588.033936,318.362122 
	C606.305664,324.783936 625.547424,325.700989 644.841492,323.398529 
	C647.092468,323.129913 649.353088,322.941254 651.609192,322.715546 
	C651.801453,323.269623 651.993652,323.823700 652.185913,324.377777 
	C643.375549,327.915741 634.744934,332.017975 625.723083,334.891815 
	C590.692139,346.050842 555.178711,345.481812 519.498230,338.354736 
	C516.394531,337.734802 513.282776,337.155121 509.595795,336.405090 
	C508.559052,336.329895 508.101318,336.406372 507.643555,336.482849 
	C508.047241,336.708832 508.450928,336.934784 508.854614,337.160767 
z"/>
<path fill="#073070" opacity="1.000000" stroke="none" 
	d="
M245.258591,761.744568 
	C263.106110,774.542542 282.498474,784.340454 303.260101,791.424988 
	C338.293640,803.379578 374.418915,807.947876 411.339386,808.150940 
	C466.363312,808.453674 519.616821,798.186218 571.946228,782.259216 
	C648.767151,758.877808 720.266907,723.901489 788.608948,682.114197 
	C821.883362,661.768677 853.922485,639.632935 885.061829,616.172302 
	C886.092102,615.395996 887.193726,614.714294 889.158630,613.379456 
	C886.676819,628.199524 884.842407,642.167725 881.942566,655.911133 
	C872.910522,698.717468 864.249817,741.625854 853.976074,784.139709 
	C843.873413,825.945801 829.159546,866.303040 809.940979,904.873413 
	C800.179443,924.464172 789.112061,943.356079 772.800903,958.314697 
	C767.550659,963.129639 761.005127,967.375244 754.295959,969.572815 
	C742.021973,973.593201 730.236267,968.992676 722.910583,956.997253 
	C717.163757,947.587219 712.309082,937.240723 709.224792,926.677551 
	C702.742798,904.478271 697.925598,881.799072 691.965393,859.439392 
	C687.364807,842.180054 681.109863,825.501221 670.945862,810.604797 
	C668.425781,806.911438 665.605164,803.318176 662.406006,800.210876 
	C645.671509,783.957764 624.912659,783.651245 607.277954,799.027344 
	C594.431824,810.228088 586.311829,824.622314 581.205017,840.392273 
	C574.033875,862.536743 568.520508,885.212463 561.733704,907.489014 
	C557.379822,921.779907 552.070801,935.782959 547.035400,949.859802 
	C546.208679,952.170837 544.690247,954.267639 543.308899,956.341797 
	C531.581116,973.950928 514.731689,977.631531 496.720978,966.346436 
	C483.859558,958.287537 474.643066,946.681946 466.570831,934.122681 
	C450.825989,909.625977 439.778473,882.918762 430.001495,855.630249 
	C429.216888,853.440308 428.454620,851.242249 427.695251,849.043335 
	C424.125793,838.707275 424.120148,838.815796 412.862762,838.059875 
	C368.178314,835.059082 325.946198,823.885864 287.460632,800.269470 
	C271.123383,790.244324 256.828033,777.892578 244.726196,762.612183 
	C244.951111,762.007324 245.104843,761.875977 245.258591,761.744568 
z"/>
<path fill="#04BAC2" opacity="1.000000" stroke="none" 
	d="
M1014.985596,465.005615 
	C1011.694519,479.776154 1004.043274,492.432281 995.457520,504.553345 
	C973.638550,535.356689 945.782043,560.126221 915.980103,582.791199 
	C829.756775,648.365784 734.500854,697.298523 633.079041,734.426453 
	C580.098511,753.821289 525.636230,768.153076 469.417572,774.393738 
	C418.488251,780.047180 367.634521,780.192688 317.602234,766.820129 
	C287.220673,758.699768 258.692566,746.518005 234.560471,725.778137 
	C218.266861,711.774963 206.441132,694.786316 201.935822,673.333801 
	C197.277267,651.151917 202.894836,630.765137 212.921860,611.228149 
	C227.400635,583.017334 249.101639,561.148071 274.386536,542.653564 
	C283.375488,536.078613 293.054291,530.440674 302.485535,524.481628 
	C304.336823,523.311951 306.498047,522.632812 308.516296,521.727417 
	C308.782959,522.095642 309.049652,522.463867 309.316345,522.832092 
	C307.571716,524.732178 305.840210,526.644470 304.080414,528.530396 
	C287.198059,546.623230 273.094818,566.446289 265.960205,590.510254 
	C255.479294,625.860596 266.517944,657.476074 296.798492,678.540222 
	C317.819458,693.163086 341.588074,701.046631 366.411285,706.138062 
	C400.623596,713.155334 435.201324,713.762695 469.891296,711.612305 
	C538.083252,707.384949 603.667419,690.931213 667.937805,668.671204 
	C762.416748,635.948425 850.693970,590.988770 932.404480,533.319397 
	C959.930969,513.891785 986.062744,492.699799 1009.950195,468.850006 
	C1011.359131,467.443298 1012.906616,466.175507 1014.709961,464.938049 
	C1015.030212,465.033020 1014.985596,465.005615 1014.985596,465.005615 
z"/>
<path fill="#083070" opacity="1.000000" stroke="none" 
	d="
M938.138672,372.000000 
	C938.151978,380.992340 938.208374,389.484894 938.164795,397.976959 
	C938.134888,403.816742 935.799622,406.289490 930.038208,406.296600 
	C910.222778,406.321045 890.406921,406.269226 870.591675,406.172150 
	C865.321350,406.146332 863.026367,403.811829 863.009277,398.498260 
	C862.945068,378.516266 862.928406,358.533966 862.962402,338.551910 
	C862.972229,332.764282 865.294434,330.319427 871.149780,330.289276 
	C890.964844,330.187225 910.781006,330.182495 930.596130,330.274231 
	C935.913452,330.298859 938.143677,332.669403 938.176392,338.029816 
	C938.244385,349.186066 938.160461,360.343231 938.138672,372.000000 
z"/>
<path fill="#04BBC3" opacity="1.000000" stroke="none" 
	d="
M1043.800903,391.000000 
	C1043.796021,398.324707 1043.820679,405.149567 1043.778076,411.974030 
	C1043.735718,418.746613 1041.493774,421.045410 1034.874390,421.057343 
	C1017.063599,421.089447 999.252869,421.099365 981.442078,421.080963 
	C975.318054,421.074615 972.916199,418.751434 972.906616,412.738403 
	C972.878174,394.927795 972.890686,377.117004 972.938293,359.306427 
	C972.955322,352.913849 975.219055,350.692352 981.718140,350.682648 
	C999.528809,350.656036 1017.339722,350.669769 1035.150391,350.706329 
	C1041.413330,350.719177 1043.743286,353.049072 1043.792725,359.539276 
	C1043.871216,369.858948 1043.805664,380.179688 1043.800903,391.000000 
z"/>
<path fill="#05BBC3" opacity="1.000000" stroke="none" 
	d="
M1006.534058,305.039673 
	C995.255798,305.060669 984.426147,305.102142 973.596680,305.079193 
	C966.856812,305.064911 964.816956,303.119629 964.790527,296.587738 
	C964.746033,285.591675 964.760376,274.595093 964.819397,263.599060 
	C964.852478,257.437256 967.086426,255.220261 973.297302,255.190491 
	C983.960144,255.139374 994.623718,255.135635 1005.286499,255.192795 
	C1011.212585,255.224564 1013.439087,257.371399 1013.501526,263.342468 
	C1013.619934,274.670898 1013.591309,286.001160 1013.579529,297.330597 
	C1013.575012,301.727753 1011.847961,304.749725 1006.534058,305.039673 
z"/>
<path fill="#073070" opacity="1.000000" stroke="none" 
	d="
M243.427414,761.484680 
	C243.012238,761.033386 242.597061,760.582092 242.181885,760.130798 
	C242.316925,759.952881 242.451965,759.774963 242.587006,759.597046 
	C243.035217,759.888855 243.483414,760.180664 243.831726,760.845947 
	C243.731842,761.219482 243.427414,761.484680 243.427414,761.484680 
z"/>
<path fill="#04BAC2" opacity="1.000000" stroke="none" 
	d="
M1015.050049,465.050079 
	C1015.119202,464.994232 1015.168518,464.921326 1015.101685,464.927002 
	C1014.985596,465.005615 1015.030212,465.033020 1015.050049,465.050079 
z"/>
<path fill="#073070" opacity="1.000000" stroke="none" 
	d="
M244.552643,762.317871 
	C244.056625,762.323669 243.834854,762.118469 243.534988,761.683105 
	C243.427414,761.484680 243.731842,761.219482 243.886108,761.089233 
	C244.370743,761.056763 244.701141,761.154480 245.145050,761.498413 
	C245.104843,761.875977 244.951111,762.007324 244.552643,762.317871 
z"/>
<path fill="#FEFEFE" opacity="1.000000" stroke="none" 
	d="
M508.979248,337.027466 
	C508.450928,336.934784 508.047241,336.708832 507.643555,336.482849 
	C508.101318,336.406372 508.559052,336.329895 509.186035,336.441467 
	C509.355286,336.629486 509.103882,336.894135 508.979248,337.027466 
z"/>
</svg>'; 

// ALTERNATIVA 3: IMAGEM EM BASE64
// Se você converteu o seu logo para Base64 (usando conversores online), cole o resultado aqui:
export const LOGO_BASE64: string = ''; // Ex: 'data:image/svg+xml;base64,PHN2Z...'

// ALTERNATIVA 4: LINKS DE ARMAZENAMENTO NUVEM (Requer permissões públicas de leitura configuradas no console do Firebase)
// 1. Se você fez o upload da imagem da LOGO COMPLETA (que já contém o dente E o texto "SmileProX" juntos),
//    substitua as aspas simples de LOGO_COMPLETO_URL pelo seu link. Exemplo: 'https://sua-url-do-firebase.svg'
export const LOGO_COMPLETO_URL: string = ''; 

// 2. Se você fez o upload APENAS do ícone do dente separado e quer que o sistema continue escrevendo
//    o texto "SmileProX" ao lado via código, cole o seu link em LOGO_ICONE_URL abaixo:
export const LOGO_ICONE_URL: string = 'http://one-dental-system.firebasestorage.app/logo/logoapp.svg'; 
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
      faviconUrl = LOGO_BASE64;
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
    return (
      <img 
        src={LOGO_BASE64} 
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
