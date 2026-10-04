// Player-facing text, Spanish. Must match the shape of `en` (checked by the type).
// Same rules as en.ts: regime text UPPERCASE with accents, slogans at most 22 characters
// per line and 2 lines, no arrows or "№".

import type { Strings } from './en';

export const es: Strings = {
  meta: {
    languageName: 'ESPAÑOL',
  },

  menu: {
    title: 'NEOLENGUA 1984',
    start: 'INICIAR SERVICIO',
    honorRoll: 'CUADRO DE HONOR',
    language: 'IDIOMA: {language}',
    pressEnter: 'PULSA ENTER',
    controls: 'FLECHAS · Z FUEGO · X ESQUIVA · C BOMBA · V VERDAD · P PAUSA',
  },

  hud: {
    score: 'PUNTOS',
    lives: 'VIDAS',
    suspicion: 'SOSPECHA',
    bombs: 'BOMBAS',
    truth: 'VERDAD',
    states: {
      normal: 'NORMAL',
      alert: 'ALERTA',
      pursuit: 'PERSECUCIÓN',
      thoughtPolice: 'POLICÍA DEL PENSAMIENTO',
    },
  },

  words: {
    FREE: 'LIBRE',
    ESCAPE: 'ESCAPAR',
    TRUTH: 'VERDAD',
    REMEMBER: 'RECORDAR',
  },

  levels: [
    { sector: 'SECTOR 1', name: 'MINISTERIO DE LA VERDAD' },
    { sector: 'SECTOR 2', name: 'MINISTERIO DE LA ABUNDANCIA' },
    { sector: 'SECTOR 3', name: 'MINISTERIO DE LA PAZ' },
    { sector: 'SECTOR 4', name: 'EL BARRIO PROLE' },
    { sector: 'SECTOR 5', name: 'MINISTERIO DEL AMOR' },
  ],

  dictionary: {
    heading: 'DICCIONARIO DE NEOLENGUA',
    edition: '{ordinal} EDICIÓN',
    ordinals: ['UNDÉCIMA', 'DUODÉCIMA', 'DECIMOTERCERA', 'DECIMOCUARTA', 'DECIMOQUINTA'],
    removed: 'LA PALABRA {word} YA NO ES NECESARIA.',
    noneRemoved: 'ESTA EDICIÓN ESTÁ COMPLETA.',
    takeOff: 'PULSA ENTER PARA DESPEGAR',
  },

  briefings: [
    [
      'Piloto {id}. Bombarderos de Eurasia se acercan a la capital. Defienda el Ministerio de la Verdad.',
      'Piloto {id}. Su expediente es satisfactorio. Procure que siga así.',
      'Piloto {id}. Hemos leído su expediente. Vuele bien hoy.',
    ],
    [
      'Piloto {id}. La producción ha vuelto a subir. La palabra {word} ha sido retirada; no la echará de menos.',
      'Piloto {id}. Algunos pilotos preguntaron adónde fue {word}. Usted no. Bien.',
      'Piloto {id}. Vuele recto. Ya no necesita volar {word}.',
    ],
    [
      'Piloto {id}. La guerra va bien. La palabra {word} ha sido retirada.',
      'Piloto {id}. No hay adónde ir, así que {word} era innecesaria.',
      'Piloto {id}. La palabra {word} ha sido retirada. La idea también.',
    ],
    [
      'Piloto {id}. Cohetes enemigos alcanzaron este barrio. La palabra {word} ha sido retirada.',
      'Piloto {id}. Debajo de usted no hay nada que valga la pena conservar.',
      'Piloto {id}. Usted no estaba aquí cuando cayó este barrio. Nadie estaba.',
    ],
    [
      'Piloto {id}. Hoy protege el Ministerio del Amor. La palabra {word} ha sido retirada. El Partido le dirá qué es verdad.',
      'Piloto {id}. El Ministerio del Amor ha preparado una habitación. Esperamos que siga vacía.',
      'Piloto {id}. Lo esperan en el Ministerio del Amor.',
    ],
  ],

  ticker: {
    enemies: {
      eurasia: 'EURASIA',
      eastasia: 'ESTASIA',
    },
    flip: 'OCEANÍA COMBATE A {enemy}. EL REGISTRO CONFIRMA QUE SIEMPRE FUE ASÍ.',
    common: [
      'FLOTA DE {enemy} DESTRUIDA FRENTE A LA COSTA',
      'LA PRODUCCIÓN SUBE UN 12% ESTE TRIMESTRE',
      'DENUNCIE LAS PALABRAS INUSUALES A SU CELADOR',
      'EL CIELO ES SEGURO. SIGA VIGILÁNDOLO.',
    ],
    byLevel: [
      ['INCURSORES DE {enemy} SOBRE LA CAPITAL', 'EL MINISTERIO DE LA VERDAD SE MANTIENE FIRME'],
      ['RACIONES AUMENTADAS A 20 G', 'COSECHA RÉCORD EN EL MINISTERIO DE LA ABUNDANCIA'],
      ['EL FRENTE AVANZA EN TODAS DIRECCIONES', 'EL MINISTERIO DE LA PAZ AGRADECE A SUS PILOTOS'],
      ['COHETES DE {enemy} GOLPEAN EL BARRIO PROLE', 'LA RECONSTRUCCIÓN EMPEZARÁ PRONTO'],
      ['SE ADMITEN VOLUNTARIOS EN EL MINISTERIO DEL AMOR', 'LA LEALTAD ES SU PROPIA RECOMPENSA'],
    ],
  },

  slogans: {
    murals: [
      'ÉL TE VE CON CLARIDAD',
      'VIGILAR ES QUERER',
      'EL CIELO NO\nRECUERDA NADA',
      'OBEDECER ES ALTURA',
      'MENOS PALABRAS\nMENTES CLARAS',
      'TUS DUDAS\nCONSTAN',
    ],
    ground: ['ÉL VE', 'MIRA ARRIBA', 'DENUNCIA', 'OBEDECE'],
    banners: [
      ['SIEMPRE ALIADOS', 'NUNCA ALIADOS'],
      ['LA GUERRA TERMINA', 'LA GUERRA ES ETERNA'],
      ['NADIE TE VIGILA', 'TODOS TE VIGILAN'],
      ['CREE EN TUS OJOS', 'CREE EN EL PARTIDO'],
    ],
    telescreens: ['ESPERE', 'EL LÍDER LE OBSERVA', 'PERMANEZCA SENTADO'],
  },

  pause: {
    title: 'PAUSA',
    note: 'LA TELEPANTALLA SIGUE ENCENDIDA',
    resume: 'PULSA P PARA CONTINUAR',
  },

  gameOver: {
    stamp: 'VAPORIZADO',
    line: 'EL PILOTO {id} NUNCA EXISTIÓ.',
    pressEnter: 'PULSA ENTER',
  },

  ministry: {
    header: 'MINISTERIO DE LA VERDAD',
    department: 'DEPARTAMENTO DE REGISTROS',
    reportedScore: 'PUNTUACIÓN DECLARADA',
    officialScore: 'PUNTUACIÓN OFICIAL',
    correctionsTitle: 'CORRECCIONES',
    corrections: {
      kills: 'Aviones enemigos derribados: {from}, corregido a {to}. Redondeado a favor del Partido.',
      eyesDestroyed: 'Torres de vigilancia perdidas: {from}, corregido a 0. No se perdió ninguna torre.',
      secondsSeen: 'Tiempo bajo observación: {from} s, corregido a 0. El piloto nunca fue observado.',
      diaries: 'Diarios recuperados: {from}, corregido a 0. Tal documento no existe.',
      removedWords: 'Palabras obsoletas recogidas: {from}, corregido a 0. Esas palabras no existen.',
    },
    stamps: {
      corrected: 'CORREGIDO',
      approved: 'APROBADO',
    },
    pressEnter: 'PULSA ENTER',
  },

  honorRoll: {
    title: 'CUADRO DE HONOR',
    pilot: 'PILOTO {id}',
    unperson: '[NO-PERSONA]',
    sector: 'SECTOR',
  },

  diary: {
    title: 'El diario',
    pages: [
      {
        line: 'El periódico decía Eurasia. Hoy dice Estasia. Guardé el viejo.',
        page: 'El periódico decía que estábamos en guerra con Eurasia. Esta mañana dice Estasia, y la fecha es la misma. Guardé el ejemplar de ayer bajo la tabla del suelo. Si alguien encuentra esto, que mire las fechas.',
      },
      {
        line: 'Antes había una palabra para volar como uno quisiera.',
        page: 'Hoy sacaron una palabra del diccionario. Nadie preguntó adónde fue. La escribí dentro del guante para no olvidar su forma. Bajaron la ración y la anunciaron como un aumento. Aplaudimos.',
      },
      {
        line: 'Los cañones del acorazado apuntaban a nuestras propias calles.',
        page: 'Junto a la vía vi al acorazado terrestre disparar contra el distrito norte. Nuestro distrito. La emisión lo llamó cohete enemigo. Sobrevolé el humo y conté los tejados. No escribiré el número.',
      },
      {
        line: 'Estas ruinas no las hizo el enemigo.',
        page: 'Nada en el barrio prole puede recordarse, así que lo recuerdo aquí. Los cráteres tienen la forma de nuestras propias bombas. El Partido escribe el pasado. Yo lo escribo de vuelta.',
      },
      {
        line: 'Saben lo del diario. Si estás leyendo esto, tienes mi asiento.',
        page: 'Hoy el oficial me sonrió. Así empieza. Si encontraste las otras páginas, sabes lo que yo sé. Borrarán mi cara de la foto del escuadrón. Toma el avión. Vuela adonde no haya telepantallas.',
      },
    ],
  },

  endings: {
    obedient: {
      title: 'UN CIUDADANO AGRADECIDO',
      lines: [
        'La guerra ha terminado con la victoria, como siempre iba a terminar.',
        'El piloto {id} ha sido destinado a un escritorio tranquilo.',
        'Cada tarde se sienta bajo la telepantalla. Ha llegado a apreciar el rostro del Líder.',
      ],
    },
    rebel: {
      title: 'El registro, sin corregir',
      lines: [
        'El piloto {id} no aterrizó.',
        'Más allá de la última telepantalla, el cielo es pálido y está vacío.',
        'Esto es lo que pasó de verdad.',
      ],
      columns: {
        item: '',
        real: 'Real',
        official: 'Oficial',
      },
      rows: {
        score: 'Puntuación',
        kills: 'Aviones derribados',
        eyesDestroyed: 'Torres destruidas',
        secondsSeen: 'Segundos observado',
        diaries: 'Páginas del diario leídas',
      },
    },
  },
};
