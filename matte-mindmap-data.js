// Mind map data — Hvorfor matematikk er viktig
// Structure: root → side (personlig/samfunn) → domain → subgroup → leaf
// Each leaf has an `ex` field with a concrete example shown on hover.
window.MM_DATA = {
  id: 'root',
  label: 'Matte & tall',
  children: [
    {
      id: 'personlig',
      label: 'Personlig',
      side: 'personal',
      children: [
        {
          label: 'Penger & økonomi',
          children: [
            {
              label: 'Daglig økonomi',
              children: [
                { label: 'Lønn, skatt & fradrag',     ex: 'Tjener du 35 000 kr, men ser bare 25 000 på konto? Matten forteller hvorfor.' },
                { label: 'Budsjett hjemme',           ex: 'Husleie + mat + strøm + buss = hvor mye er igjen til det du faktisk vil bruke penger på?' },
                { label: 'Sammenligne priser',        ex: 'Er 500 g for 39 kr billigere enn 750 g for 55 kr? Pris per kilo avgjør.' },
                { label: 'Rabatter & mva',            ex: '40 % avslag på en pris som allerede er økt med 60 %. Er det egentlig et tilbud?' }
              ]
            },
            {
              label: 'Lån & sparing',
              children: [
                { label: 'Renter på lån',             ex: '3 millioner i boliglån til 5 % rente koster ~12 500 kr i renter — hver måned.' },
                { label: 'Renter på sparing',         ex: '500 kr i måneden i 30 år med 7 % avkastning blir over 600 000 kr.' },
                { label: 'Kredittkort & gjeld',       ex: 'Kredittkortgjeld til 24 % rente dobler seg på under fire år hvis du bare betaler minimum.' },
                { label: 'Pensjon',                   ex: 'Den dagen du er 67 lever du av tall du sparte da du var 25. Begynn nå.' }
              ]
            },
            {
              label: 'Investering',
              children: [
                { label: 'Aksjer & fond',             ex: 'Forskjellen på et fond med 0,2 % og 1,5 % i årlig gebyr er hundretusener over et liv.' }
              ]
            }
          ]
        },
        {
          label: 'Hverdag & hjem',
          children: [
            {
              label: 'Hjemmeprosjekter',
              children: [
                { label: 'Møblere & måle',            ex: 'Får sofaen plass? Trekk fra dørkarmen, beregn diagonalen, sjekk om den svinger rundt hjørnet.' },
                { label: 'Maling & materialer',       ex: 'En vegg på 4 × 2,5 m trenger ca. 1 liter maling per strøk. Hvor mange spann?' },
                { label: 'Oppskrifter (doble/halve)', ex: 'Oppskriften er til 4. Dere er 7. Hvor mye av alt?' }
              ]
            },
            {
              label: 'På reise',
              children: [
                { label: 'Reisetid',                  ex: 'Bussen tar 25 min, men kommer hvert 15. min. Hvor tidlig må du gå?' },
                { label: 'Drivstoff & rekkevidde',    ex: '0,6 l/mil og 40 liter tank → kommer du fram før neste bensinstasjon?' },
                { label: 'Kart & avstander',          ex: 'Kartet sier 1:50 000. 4 cm på kartet = 2 km i virkeligheten.' },
                { label: 'Tidssoner',                 ex: 'Du ringer venninnen din i Sydney. Klokka der er +9 timer — er hun våken?' }
              ]
            },
            {
              label: 'Forbruk',
              children: [
                { label: 'Strømregning',              ex: 'En varmeovn på 1500 W i 8 timer = 12 kWh. Gang med strømprisen — det blir merkbart.' }
              ]
            }
          ]
        },
        {
          label: 'Helse & kropp',
          children: [
            {
              label: 'Ernæring',
              children: [
                { label: 'Kalorier & næring',         ex: 'Du trenger ~2200 kcal/dag. Brusen tar 200, sjokoladen 250 — fort.' }
              ]
            },
            {
              label: 'Trening',
              children: [
                { label: 'Treningsdata & fremgang',   ex: 'Du løper 5 km på 27 min. Forrige måned: 29 min. Det er 7 % raskere.' },
                { label: 'BMI & helsestatistikk',     ex: 'BMI = vekt / høyde². Ett av mange tall som hjelper deg å lese kroppen.' }
              ]
            },
            {
              label: 'Medisin',
              children: [
                { label: 'Legemiddeldoser',           ex: '10 mg per kg kroppsvekt. Veier du 60 kg → 600 mg. Feil komma kan være farlig.' },
                { label: 'Blodprøvesvar',             ex: 'Hb 13,2. Referanseområde 13,4–17,0. Er det grunn til bekymring?' }
              ]
            },
            {
              label: 'Hvile',
              children: [
                { label: 'Søvn & døgnrytme',          ex: 'Du trenger 8 timer. Du må opp 06:30. Når må du legge deg?' }
              ]
            }
          ]
        },
        {
          label: 'Jobb & karriere',
          children: [
            {
              label: 'Daglig jobb',
              children: [
                { label: 'Nesten alle yrker',         ex: 'Snekkere, sykepleiere, kokker, frisører, designere — alle regner. Daglig.' },
                { label: 'Rapporter & statistikk',    ex: 'Salget gikk opp 12 %. Sammenlignet med hva? I forhold til hvem?' },
                { label: 'Kontrakter & avtaler',      ex: 'Provisjon 8 % av nettoomsetning over 200 000. Hva betyr det egentlig?' }
              ]
            },
            {
              label: 'Prosjekter',
              children: [
                { label: 'Planlegging & tidslinjer',  ex: '12 oppgaver. 3 personer. 4 uker. Holder det? Hvor er flaskehalsen?' },
                { label: 'Materialer & kostnader',    ex: 'Tilbud til kunde: timer × timepris + materialer + 15 % påslag. Lønner det seg?' }
              ]
            },
            {
              label: 'Digitalt',
              children: [
                { label: 'Programmere & automatisere', ex: 'En liten formel i Excel sparer deg for to timer hver fredag — for resten av karrieren.' }
              ]
            }
          ]
        },
        {
          label: 'Teknologi & spill',
          children: [
            {
              label: 'Algoritmer',
              children: [
                { label: 'Anbefalingsalgoritmer',     ex: 'TikTok og YouTube bestemmer hva du ser ut fra sannsynlighet. Du er en kolonne i et regneark.' },
                { label: 'Sannsynlighet i spill',     ex: 'Sjansen for kritisk treff er 12 %. Hva er sjansen for 3 på rad? (Den er liten.)' }
              ]
            },
            {
              label: 'Grafikk',
              children: [
                { label: 'Piksler & oppløsning',      ex: 'Et 4K-bilde er 3840 × 2160 = 8,3 millioner små farger satt sammen med matematikk.' }
              ]
            },
            {
              label: 'Sikkerhet',
              children: [
                { label: 'GPS & koordinater',         ex: 'Mobilen din regner ut posisjonen din fra satellitter i bane — på centimeteren.' },
                { label: 'Kryptering & passord',      ex: 'Passordet ditt blir til et tall så stort at det ville tatt universets alder å gjette.' }
              ]
            }
          ]
        },
        {
          label: 'Kritisk tenkning',
          children: [
            {
              label: 'Tall i media',
              children: [
                { label: 'Villedende statistikk',     ex: '«Dobbelt så høy risiko» kan bety 1 av 5000 → 2 av 5000. Lite skummelt i praksis.' },
                { label: 'Prosenter i nyheter',       ex: '«Prisen gikk opp 50 %, så ned 50 %» — og du er fattigere enn før. Hvorfor?' }
              ]
            },
            {
              label: 'Risiko',
              children: [
                { label: 'Vurdere risiko',            ex: 'Du frykter fly, men kjører bil hver dag. Tallene sier det motsatte er fornuftig.' },
                { label: 'Beslutninger under tvil',   ex: 'Skal du ta studielånet? Forventet verdi sier deg når det lønner seg.' },
                { label: 'Bli ikke lurt av tall',     ex: 'Når selgeren snakker fort om prosenter — be om kronebeløp. Det er der det egentlig skjer.' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'samfunn',
      label: 'Samfunn',
      side: 'society',
      children: [
        {
          label: 'Vitenskap & oppdagelse',
          children: [
            {
              label: 'Universet',
              children: [
                { label: 'Planetbaner & romfart',     ex: 'Vi sendte mennesker til Månen med matematikk fra 1600-tallet og en datamaskin svakere enn mobilen din.' },
                { label: 'Stjerneavstander',          ex: 'Lyset fra nærmeste stjerne brukte 4 år på å nå deg. Vi måler dette ved parallaks.' },
                { label: 'Nye planeter',              ex: 'Neptun ble funnet før noen så den — matten forutsa hvor den måtte være.' },
                { label: 'Svarte hull',               ex: 'Einsteins ligninger forutsa svarte hull 50 år før vi fotograferte ett.' }
              ]
            },
            {
              label: 'Tid & rom',
              children: [
                { label: 'Relativitet & tid',         ex: 'GPS-satellitter ville gitt deg 10 km feil hver dag uten Einsteins relativitet.' }
              ]
            },
            {
              label: 'Det aller minste',
              children: [
                { label: 'Kvantefysikk & partikler',  ex: 'Higgs-bosonet ble forutsagt i en ligning i 1964 — og funnet 48 år senere.' }
              ]
            },
            {
              label: 'Livet',
              children: [
                { label: 'DNA & genetikk',            ex: 'Genomet ditt er 3 milliarder bokstaver. Å lese det krever statistiske algoritmer.' }
              ]
            },
            {
              label: 'Klode',
              children: [
                { label: 'Klimamodeller',             ex: 'Hver klimaprognose er millioner av ligninger som beskriver hav, atmosfære og is.' }
              ]
            }
          ]
        },
        {
          label: 'Medisin & helse',
          children: [
            {
              label: 'Epidemier',
              children: [
                { label: 'Spredning av sykdom',       ex: 'R-tallet under pandemien var matematikk i sanntid — det styrte hele samfunnet.' }
              ]
            },
            {
              label: 'Legemidler',
              children: [
                { label: 'Doseringsmodeller',         ex: 'Hvor fort brytes medisinen ned? Differensialligninger bestemmer hvor mye du skal ta.' }
              ]
            },
            {
              label: 'Utstyr',
              children: [
                { label: 'MR & EKG',                  ex: 'En MR-maskin bruker Fourier-transformasjon for å forvandle radiobølger til bilder av hjernen.' }
              ]
            },
            {
              label: 'Statistikk',
              children: [
                { label: 'Vaksinestatistikk',         ex: 'Vi vet at vaksiner virker fordi vi sammenligner tusenvis av personer matematisk korrekt.' },
                { label: 'Overlevelsesrater',         ex: 'Femårsoverlevelse for kreft er en statistisk modell som styrer behandlingsvalg.' }
              ]
            },
            {
              label: 'Forskning',
              children: [
                { label: 'Kartlegge hjernen',         ex: 'Hver fMRI-skanning er millioner av tall som blir til et bilde av tanker.' }
              ]
            },
            {
              label: 'Logistikk',
              children: [
                { label: 'Sykehus & vaktlister',      ex: 'Hvem opererer? Hvem har vakt? Optimering bestemmer det matematisk.' }
              ]
            }
          ]
        },
        {
          label: 'Teknologi & ingeniørfag',
          children: [
            {
              label: 'Bygg',
              children: [
                { label: 'Broer & skyskrapere',       ex: 'En bro må tåle vind, vekt, jordskjelv. Hver bjelke er en ligning.' },
                { label: 'Elektriske nettverk',       ex: 'Strømnettet balanseres millisekund for millisekund — overalt i Norge, samtidig.' }
              ]
            },
            {
              label: 'Transport',
              children: [
                { label: 'Fly & aerodynamikk',        ex: 'Bernoullis ligning forklarer hvorfor 200 tonn stål kan fly.' },
                { label: 'Selvkjørende biler',        ex: 'Bilen forutser hva andre bilister gjør med sannsynlighet og matriser, mange ganger i sekundet.' },
                { label: 'Raketter & satellitter',    ex: 'Hver oppskytning er en koreografi mellom drivstoff, gravitasjon og baner.' }
              ]
            },
            {
              label: 'Digitalt',
              children: [
                { label: 'Kunstig intelligens',       ex: 'ChatGPT er milliarder av tall som er multiplisert sammen for å gjette neste ord.' },
                { label: 'Prosessorer & databrikker', ex: 'En moderne chip har 50 milliarder transistorer plassert med atomær presisjon.' },
                { label: 'Internett & kryptering',    ex: 'Hver gang du logger på banken, beskytter en matteoppgave med to enorme primtall deg.' }
              ]
            }
          ]
        },
        {
          label: 'Økonomi & samfunn',
          children: [
            {
              label: 'Verdensøkonomi',
              children: [
                { label: 'Globale modeller',          ex: 'Sentralbankene styrer rentene basert på modeller av hele økonomien.' },
                { label: 'Inflasjon & valuta',        ex: 'Når kronen svekkes 10 %, blir ferien dyrere og maten på butikken også.' },
                { label: 'Forutsi finanskriser',      ex: 'Etter 2008 oppdaget vi at få forstod matematikken bak risikoen — det vil vi unngå igjen.' }
              ]
            },
            {
              label: 'Velferd',
              children: [
                { label: 'Skatt & velferd',           ex: 'Hvor mye må vi betale for at alle skal ha sykehus, skole og pensjon? Det er matematikk.' },
                { label: 'Rettferdig fordeling',      ex: 'Hvordan deler vi en kake hvor ingen synes andres bit er større? Et matematisk problem.' }
              ]
            },
            {
              label: 'Byer',
              children: [
                { label: 'Planlegge byer',            ex: 'Hvor skal busstoppet være? Spørsmålet løses med kø-teori og nettverksmatematikk.' },
                { label: 'Logistikk & transport',     ex: 'Postens biler kjører ruter optimert med algoritmer — sparer millioner av kilometer.' }
              ]
            }
          ]
        },
        {
          label: 'Klima & miljø',
          children: [
            {
              label: 'Klima',
              children: [
                { label: 'Havnivåstigning',           ex: 'Hvor mye is må smelte for at Bergen oversvømmes? Tallene finnes — og er urovekkende.' },
                { label: 'CO₂-budsjett',              ex: 'Vi har et globalt karbonbudsjett. Matematikken sier akkurat hvor mye vi har igjen.' },
                { label: 'Vær & ekstremvær',          ex: 'Værmeldingen er en superdatamaskin som regner 10 milliarder ligninger hver morgen.' }
              ]
            },
            {
              label: 'Energi',
              children: [
                { label: 'Fornybar energi',           ex: 'Sol og vind varierer. Matematikken balanserer nettet så lyset alltid er på.' }
              ]
            },
            {
              label: 'Natur',
              children: [
                { label: 'Artsutryddelse',            ex: 'Vi estimerer at 1 million arter er truet — basert på populasjonsmodeller.' },
                { label: 'Bærekraftig matproduksjon', ex: 'Hvor mye mat per kvadratmeter, med hvor lite vann? Statistikken bestemmer fremtiden.' }
              ]
            }
          ]
        },
        {
          label: 'Kunst, musikk & kultur',
          children: [
            {
              label: 'Lyd',
              children: [
                { label: 'Musikk er matematikk',      ex: 'En oktav er et frekvensforhold på 2:1. Hele musikken bygger på enkle brøker.' },
                { label: 'Rytme & koreografi',        ex: 'Dansere teller. 5–6–7–8. Hele kunsten er bygd på taktarter.' }
              ]
            },
            {
              label: 'Bilde',
              children: [
                { label: 'Perspektiv & proporsjoner', ex: 'Renessansens malere oppfant projektiv geometri for å få bilder til å se ekte ut.' },
                { label: 'Animasjon & 3D',            ex: 'Hver Pixar-film er millioner av lineære transformasjoner per sekund.' },
                { label: 'Filmklipping & timing',     ex: 'En klippers timing er en matematisk presis følelse av hva som varer hvor lenge.' }
              ]
            },
            {
              label: 'Bygg',
              children: [
                { label: 'Arkitektur & gyldne snitt', ex: 'Parthenon, Notre-Dame, Operaen — proporsjoner som har holdt seg i 2500 år.' }
              ]
            }
          ]
        },
        {
          label: 'Filosofi & forståelse',
          children: [
            {
              label: 'Uendelighet',
              children: [
                { label: 'Det uendelig store & små',  ex: 'Det finnes mange slags uendelig. Noen er større enn andre. Det er matematisk bevist.' }
              ]
            },
            {
              label: 'Sannhet',
              children: [
                { label: 'Bevise evige sannheter',    ex: 'Pytagoras\u2019 setning er like sann nå som for 2500 år siden. Det er noe matten har som intet annet fag.' },
                { label: 'Symmetri som naturlov',     ex: 'Hver bevart størrelse i universet svarer til en symmetri. Det viste Emmy Noether.' }
              ]
            },
            {
              label: 'Natur',
              children: [
                { label: 'Kaos & orden',              ex: 'Et sommerfuglslag kan endre været en uke senere. Vi har en hel teori om dette.' }
              ]
            },
            {
              label: 'Sinn',
              children: [
                { label: 'Bevissthet & intelligens',  ex: 'Kan tanker beregnes? Forskere bruker informasjonsteori for å forsøke å forstå sinnet.' },
                { label: 'Universets natur',          ex: 'Hvorfor er universet matematisk i det hele tatt? Det er kanskje det dypeste spørsmålet vi har.' }
              ]
            }
          ]
        }
      ]
    }
  ]
};
