/**
 * Authoritative HDBRTS Corridor and Station Data for Aggregator
 * Extracted directly from data/chigariRoute.ts (single centerline & 36 verified stops)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StationPoint {
  id: string;
  order: number;
  name: string;
  latitude: number;
  longitude: number;
  distanceAlongRoute: number;
}

export const AUTHORITATIVE_SERVICES = ['200A', '201B', '100D', '202C', '202D'] as const;
export type AuthoritativeService = typeof AUTHORITATIVE_SERVICES[number];

export const HDBRTS_STATIONS: StationPoint[] = [
  {
    "id": "hdbrts-stop-01",
    "order": 1,
    "name": "Dharwad New Bus Stand",
    "latitude": 15.4665,
    "longitude": 75.0142,
    "distanceAlongRoute": 22953
  },
  {
    "id": "hdbrts-stop-02",
    "order": 2,
    "name": "Dharwad BRTS Terminal",
    "latitude": 15.46016,
    "longitude": 75.009429,
    "distanceAlongRoute": 21891
  },
  {
    "id": "hdbrts-stop-03",
    "order": 3,
    "name": "Jubilee Circle",
    "latitude": 15.458058,
    "longitude": 75.007491,
    "distanceAlongRoute": 21488
  },
  {
    "id": "hdbrts-stop-04",
    "order": 4,
    "name": "Dharwad Court Circle",
    "latitude": 15.455642,
    "longitude": 75.007025,
    "distanceAlongRoute": 21213
  },
  {
    "id": "hdbrts-stop-05",
    "order": 5,
    "name": "NTTF",
    "latitude": 15.453608,
    "longitude": 75.00913,
    "distanceAlongRoute": 20909
  },
  {
    "id": "hdbrts-stop-06",
    "order": 6,
    "name": "Hosayellapur",
    "latitude": 15.449703,
    "longitude": 75.011221,
    "distanceAlongRoute": 20422
  },
  {
    "id": "hdbrts-stop-07",
    "order": 7,
    "name": "Tollnaka",
    "latitude": 15.446085,
    "longitude": 75.012697,
    "distanceAlongRoute": 19948
  },
  {
    "id": "hdbrts-stop-08",
    "order": 8,
    "name": "Vidyagiri",
    "latitude": 15.44085,
    "longitude": 75.016861,
    "distanceAlongRoute": 19203
  },
  {
    "id": "hdbrts-stop-09",
    "order": 9,
    "name": "Gandhinagar",
    "latitude": 15.437785,
    "longitude": 75.019192,
    "distanceAlongRoute": 18784
  },
  {
    "id": "hdbrts-stop-10",
    "order": 10,
    "name": "Lakamanahalli",
    "latitude": 15.432911,
    "longitude": 75.024929,
    "distanceAlongRoute": 17938
  },
  {
    "id": "hdbrts-stop-11",
    "order": 11,
    "name": "Navalur",
    "latitude": 15.4245,
    "longitude": 75.0345,
    "distanceAlongRoute": 16422
  },
  {
    "id": "hdbrts-stop-12",
    "order": 12,
    "name": "Sattur",
    "latitude": 15.418304,
    "longitude": 75.042541,
    "distanceAlongRoute": 15325
  },
  {
    "id": "hdbrts-stop-13",
    "order": 13,
    "name": "SDM Medical College",
    "latitude": 15.417389,
    "longitude": 75.047967,
    "distanceAlongRoute": 14733
  },
  {
    "id": "hdbrts-stop-14",
    "order": 14,
    "name": "Navalur Railway Station",
    "latitude": 15.415155,
    "longitude": 75.053843,
    "distanceAlongRoute": 14060
  },
  {
    "id": "hdbrts-stop-15",
    "order": 15,
    "name": "KMF 1",
    "latitude": 15.409349,
    "longitude": 75.060749,
    "distanceAlongRoute": 13058
  },
  {
    "id": "hdbrts-stop-16",
    "order": 16,
    "name": "Rayapur",
    "latitude": 15.406712,
    "longitude": 75.065026,
    "distanceAlongRoute": 12494
  },
  {
    "id": "hdbrts-stop-17",
    "order": 17,
    "name": "ISKCON",
    "latitude": 15.404742,
    "longitude": 75.070007,
    "distanceAlongRoute": 11879
  },
  {
    "id": "hdbrts-stop-18",
    "order": 18,
    "name": "RTO",
    "latitude": 15.400625,
    "longitude": 75.077294,
    "distanceAlongRoute": 11026
  },
  {
    "id": "hdbrts-stop-19",
    "order": 19,
    "name": "Navanagar",
    "latitude": 15.39715,
    "longitude": 75.082543,
    "distanceAlongRoute": 10327
  },
  {
    "id": "hdbrts-stop-20",
    "order": 20,
    "name": "APMC 3rd Gate",
    "latitude": 15.39367,
    "longitude": 75.092154,
    "distanceAlongRoute": 9182
  },
  {
    "id": "hdbrts-stop-21",
    "order": 21,
    "name": "Shantiniketan",
    "latitude": 15.391352,
    "longitude": 75.098158,
    "distanceAlongRoute": 8507
  },
  {
    "id": "hdbrts-stop-22",
    "order": 22,
    "name": "Bairidevarkoppa",
    "latitude": 15.387034,
    "longitude": 75.105381,
    "distanceAlongRoute": 7572
  },
  {
    "id": "hdbrts-stop-23",
    "order": 23,
    "name": "Unkal Lake",
    "latitude": 15.382329,
    "longitude": 75.11188,
    "distanceAlongRoute": 6681
  },
  {
    "id": "hdbrts-stop-24",
    "order": 24,
    "name": "Unkal",
    "latitude": 15.375645,
    "longitude": 75.114143,
    "distanceAlongRoute": 5842
  },
  {
    "id": "hdbrts-stop-25",
    "order": 25,
    "name": "Unkal Cross",
    "latitude": 15.370132,
    "longitude": 75.118875,
    "distanceAlongRoute": 5010
  },
  {
    "id": "hdbrts-stop-26",
    "order": 26,
    "name": "BVB",
    "latitude": 15.367615,
    "longitude": 75.121185,
    "distanceAlongRoute": 4632
  },
  {
    "id": "hdbrts-stop-27",
    "order": 27,
    "name": "Vidyanagar",
    "latitude": 15.364002,
    "longitude": 75.124867,
    "distanceAlongRoute": 4076
  },
  {
    "id": "hdbrts-stop-28",
    "order": 28,
    "name": "KIMS",
    "latitude": 15.36021,
    "longitude": 75.12715,
    "distanceAlongRoute": 3585
  },
  {
    "id": "hdbrts-stop-29",
    "order": 29,
    "name": "Hosur Regional Bus Station",
    "latitude": 15.357265,
    "longitude": 75.128937,
    "distanceAlongRoute": 3196
  },
  {
    "id": "hdbrts-stop-30",
    "order": 30,
    "name": "Hosur Cross",
    "latitude": 15.354759,
    "longitude": 75.130456,
    "distanceAlongRoute": 2882
  },
  {
    "id": "hdbrts-stop-31",
    "order": 31,
    "name": "Gokul Bus Station",
    "latitude": 15.349077,
    "longitude": 75.11809,
    "distanceAlongRoute": 2991
  },
  {
    "id": "hdbrts-stop-32",
    "order": 32,
    "name": "Hubballi Central Bus Stand / Rani Channamma Circle",
    "latitude": 15.351148,
    "longitude": 75.13626,
    "distanceAlongRoute": 2121
  },
  {
    "id": "hdbrts-stop-33",
    "order": 33,
    "name": "HDMC",
    "latitude": 15.350859,
    "longitude": 75.140701,
    "distanceAlongRoute": 1580
  },
  {
    "id": "hdbrts-stop-34",
    "order": 34,
    "name": "Dr. B R Ambedkar Circle",
    "latitude": 15.352889,
    "longitude": 75.145389,
    "distanceAlongRoute": 1025
  },
  {
    "id": "hdbrts-stop-35",
    "order": 35,
    "name": "Hubballi CBT",
    "latitude": 15.344637,
    "longitude": 75.145415,
    "distanceAlongRoute": 0
  },
  {
    "id": "hdbrts-stop-36",
    "order": 36,
    "name": "Hubballi Railway Station",
    "latitude": 15.349537,
    "longitude": 75.14845,
    "distanceAlongRoute": 704
  }
];

export const HDBRTS_CORRIDOR_POINTS: Coordinates[] = [{"latitude":15.344586,"longitude":75.145151},{"latitude":15.344882,"longitude":75.14509},{"latitude":15.34528,"longitude":75.145006},{"latitude":15.345765,"longitude":75.144882},{"latitude":15.346147,"longitude":75.144779},{"latitude":15.346284,"longitude":75.145528},{"latitude":15.347814,"longitude":75.145437},{"latitude":15.348598,"longitude":75.145556},{"latitude":15.350251,"longitude":75.145774},{"latitude":15.350506,"longitude":75.145802},{"latitude":15.35127,"longitude":75.145889},{"latitude":15.351475,"longitude":75.145896},{"latitude":15.352311,"longitude":75.145855},{"latitude":15.352704,"longitude":75.145823},{"latitude":15.35284,"longitude":75.145402},{"latitude":15.352719,"longitude":75.144925},{"latitude":15.352704,"longitude":75.144653},{"latitude":15.352612,"longitude":75.14456},{"latitude":15.352566,"longitude":75.144346},{"latitude":15.352399,"longitude":75.143814},{"latitude":15.352261,"longitude":75.14339},{"latitude":15.352142,"longitude":75.143161},{"latitude":15.351939,"longitude":75.142799},{"latitude":15.351329,"longitude":75.1418},{"latitude":15.351141,"longitude":75.141562},{"latitude":15.351047,"longitude":75.141408},{"latitude":15.350968,"longitude":75.14123},{"latitude":15.350849,"longitude":75.140947},{"latitude":15.350838,"longitude":75.140907},{"latitude":15.350796,"longitude":75.140759},{"latitude":15.350728,"longitude":75.140515},{"latitude":15.350638,"longitude":75.140196},{"latitude":15.350546,"longitude":75.139884},{"latitude":15.350397,"longitude":75.139268},{"latitude":15.350342,"longitude":75.138938},{"latitude":15.350323,"longitude":75.138828},{"latitude":15.350155,"longitude":75.137938},{"latitude":15.350125,"longitude":75.137778},{"latitude":15.350084,"longitude":75.137723},{"latitude":15.35007,"longitude":75.137686},{"latitude":15.350062,"longitude":75.137647},{"latitude":15.350061,"longitude":75.137607},{"latitude":15.350068,"longitude":75.137567},{"latitude":15.350089,"longitude":75.137517},{"latitude":15.350106,"longitude":75.137495},{"latitude":15.350122,"longitude":75.137475},{"latitude":15.350164,"longitude":75.137442},{"latitude":15.350213,"longitude":75.137422},{"latitude":15.350265,"longitude":75.137415},{"latitude":15.350363,"longitude":75.137248},{"latitude":15.350464,"longitude":75.137114},{"latitude":15.350491,"longitude":75.13707},{"latitude":15.350565,"longitude":75.13695},{"latitude":15.35058,"longitude":75.136926},{"latitude":15.350906,"longitude":75.136449},{"latitude":15.351024,"longitude":75.136294},{"latitude":15.351094,"longitude":75.136211},{"latitude":15.35111,"longitude":75.136192},{"latitude":15.351247,"longitude":75.136036},{"latitude":15.351457,"longitude":75.135786},{"latitude":15.351671,"longitude":75.135508},{"latitude":15.35173,"longitude":75.135415},{"latitude":15.352049,"longitude":75.134837},{"latitude":15.352252,"longitude":75.134363},{"latitude":15.352384,"longitude":75.134053},{"latitude":15.35244,"longitude":75.133916},{"latitude":15.352904,"longitude":75.132839},{"latitude":15.353057,"longitude":75.132505},{"latitude":15.353193,"longitude":75.132178},{"latitude":15.353394,"longitude":75.131764},{"latitude":15.353433,"longitude":75.131684},{"latitude":15.35366,"longitude":75.131215},{"latitude":15.353758,"longitude":75.131057},{"latitude":15.3538,"longitude":75.131002},{"latitude":15.353983,"longitude":75.13086},{"latitude":15.354088,"longitude":75.130778},{"latitude":15.354169,"longitude":75.130679},{"latitude":15.354341,"longitude":75.130577},{"latitude":15.354477,"longitude":75.130497},{"latitude":15.354555,"longitude":75.130452},{"latitude":15.354606,"longitude":75.130423},{"latitude":15.354709,"longitude":75.130363},{"latitude":15.354734,"longitude":75.130349},{"latitude":15.355212,"longitude":75.130077},{"latitude":15.355452,"longitude":75.129942},{"latitude":15.35557,"longitude":75.129872},{"latitude":15.355688,"longitude":75.129805},{"latitude":15.355848,"longitude":75.129714},{"latitude":15.355883,"longitude":75.129693},{"latitude":15.356003,"longitude":75.129621},{"latitude":15.356175,"longitude":75.129512},{"latitude":15.356349,"longitude":75.129405},{"latitude":15.356526,"longitude":75.129292},{"latitude":15.356676,"longitude":75.12919},{"latitude":15.356988,"longitude":75.128982},{"latitude":15.357144,"longitude":75.128878},{"latitude":15.357301,"longitude":75.128779},{"latitude":15.357426,"longitude":75.128701},{"latitude":15.357702,"longitude":75.12857},{"latitude":15.357931,"longitude":75.128436},{"latitude":15.358698,"longitude":75.127961},{"latitude":15.358812,"longitude":75.127888},{"latitude":15.35912,"longitude":75.127682},{"latitude":15.359517,"longitude":75.127428},{"latitude":15.359834,"longitude":75.127235},{"latitude":15.359914,"longitude":75.127186},{"latitude":15.359993,"longitude":75.127136},{"latitude":15.360153,"longitude":75.127045},{"latitude":15.360157,"longitude":75.127043},{"latitude":15.360474,"longitude":75.126875},{"latitude":15.360773,"longitude":75.12673},{"latitude":15.360799,"longitude":75.126715},{"latitude":15.360898,"longitude":75.126662},{"latitude":15.360915,"longitude":75.126653},{"latitude":15.361149,"longitude":75.126521},{"latitude":15.361287,"longitude":75.126447},{"latitude":15.361475,"longitude":75.126341},{"latitude":15.361853,"longitude":75.126138},{"latitude":15.362021,"longitude":75.126045},{"latitude":15.362603,"longitude":75.125734},{"latitude":15.362958,"longitude":75.125537},{"latitude":15.363194,"longitude":75.125399},{"latitude":15.363401,"longitude":75.125267},{"latitude":15.363548,"longitude":75.125152},{"latitude":15.363681,"longitude":75.125032},{"latitude":15.36375,"longitude":75.124959},{"latitude":15.363775,"longitude":75.124931},{"latitude":15.363814,"longitude":75.124887},{"latitude":15.36395,"longitude":75.124744},{"latitude":15.363966,"longitude":75.124728},{"latitude":15.364309,"longitude":75.124392},{"latitude":15.36467,"longitude":75.124049},{"latitude":15.364766,"longitude":75.123957},{"latitude":15.36483,"longitude":75.123897},{"latitude":15.36518,"longitude":75.123505},{"latitude":15.365367,"longitude":75.123303},{"latitude":15.365554,"longitude":75.123118},{"latitude":15.365805,"longitude":75.122837},{"latitude":15.366091,"longitude":75.122545},{"latitude":15.366276,"longitude":75.122348},{"latitude":15.366467,"longitude":75.12215},{"latitude":15.366846,"longitude":75.121766},{"latitude":15.366915,"longitude":75.121697},{"latitude":15.367074,"longitude":75.121537},{"latitude":15.367238,"longitude":75.121376},{"latitude":15.3675,"longitude":75.121101},{"latitude":15.368139,"longitude":75.12051},{"latitude":15.368205,"longitude":75.120456},{"latitude":15.368519,"longitude":75.120198},{"latitude":15.368651,"longitude":75.120086},{"latitude":15.368721,"longitude":75.120027},{"latitude":15.368822,"longitude":75.119939},{"latitude":15.368924,"longitude":75.119844},{"latitude":15.368971,"longitude":75.119801},{"latitude":15.3691,"longitude":75.119682},{"latitude":15.369278,"longitude":75.119515},{"latitude":15.369604,"longitude":75.119196},{"latitude":15.369662,"longitude":75.11914},{"latitude":15.36973,"longitude":75.119074},{"latitude":15.36989,"longitude":75.118919},{"latitude":15.370052,"longitude":75.118772},{"latitude":15.370217,"longitude":75.118625},{"latitude":15.370387,"longitude":75.118484},{"latitude":15.370558,"longitude":75.118365},{"latitude":15.370747,"longitude":75.118284},{"latitude":15.370802,"longitude":75.118259},{"latitude":15.371304,"longitude":75.118014},{"latitude":15.371688,"longitude":75.117834},{"latitude":15.371988,"longitude":75.117705},{"latitude":15.372213,"longitude":75.117615},{"latitude":15.372509,"longitude":75.117429},{"latitude":15.372786,"longitude":75.117257},{"latitude":15.372813,"longitude":75.117241},{"latitude":15.372968,"longitude":75.117102},{"latitude":15.373051,"longitude":75.117025},{"latitude":15.373142,"longitude":75.116945},{"latitude":15.373385,"longitude":75.116723},{"latitude":15.373454,"longitude":75.116659},{"latitude":15.37353,"longitude":75.116589},{"latitude":15.373867,"longitude":75.116276},{"latitude":15.374068,"longitude":75.116068},{"latitude":15.374149,"longitude":75.115939},{"latitude":15.374203,"longitude":75.115829},{"latitude":15.374247,"longitude":75.115709},{"latitude":15.374296,"longitude":75.115315},{"latitude":15.374348,"longitude":75.1151},{"latitude":15.374408,"longitude":75.11492},{"latitude":15.374492,"longitude":75.114806},{"latitude":15.374536,"longitude":75.114755},{"latitude":15.374586,"longitude":75.114718},{"latitude":15.374788,"longitude":75.114582},{"latitude":15.375266,"longitude":75.114247},{"latitude":15.375601,"longitude":75.114043},{"latitude":15.37581,"longitude":75.113909},{"latitude":15.37601,"longitude":75.113785},{"latitude":15.376062,"longitude":75.113762},{"latitude":15.376215,"longitude":75.113694},{"latitude":15.376353,"longitude":75.11364},{"latitude":15.376723,"longitude":75.113516},{"latitude":15.376826,"longitude":75.113479},{"latitude":15.376899,"longitude":75.113453},{"latitude":15.377079,"longitude":75.113399},{"latitude":15.377216,"longitude":75.113363},{"latitude":15.377796,"longitude":75.113257},{"latitude":15.377946,"longitude":75.113225},{"latitude":15.378115,"longitude":75.113193},{"latitude":15.378558,"longitude":75.113128},{"latitude":15.378802,"longitude":75.113122},{"latitude":15.378961,"longitude":75.113134},{"latitude":15.379272,"longitude":75.113192},{"latitude":15.379376,"longitude":75.113222},{"latitude":15.379465,"longitude":75.113255},{"latitude":15.379617,"longitude":75.11329},{"latitude":15.379762,"longitude":75.11331},{"latitude":15.379971,"longitude":75.113313},{"latitude":15.380095,"longitude":75.11331},{"latitude":15.380248,"longitude":75.113303},{"latitude":15.380335,"longitude":75.113291},{"latitude":15.380812,"longitude":75.113207},{"latitude":15.381099,"longitude":75.113133},{"latitude":15.381586,"longitude":75.11299},{"latitude":15.38175,"longitude":75.112909},{"latitude":15.381846,"longitude":75.112861},{"latitude":15.381996,"longitude":75.112663},{"latitude":15.382085,"longitude":75.112457},{"latitude":15.382156,"longitude":75.11218},{"latitude":15.382166,"longitude":75.112142},{"latitude":15.382229,"longitude":75.111856},{"latitude":15.382273,"longitude":75.111659},{"latitude":15.382389,"longitude":75.111167},{"latitude":15.382516,"longitude":75.110671},{"latitude":15.382613,"longitude":75.11028},{"latitude":15.382703,"longitude":75.109914},{"latitude":15.382762,"longitude":75.109705},{"latitude":15.382823,"longitude":75.109519},{"latitude":15.382889,"longitude":75.109359},{"latitude":15.382927,"longitude":75.109287},{"latitude":15.382982,"longitude":75.109182},{"latitude":15.383113,"longitude":75.109012},{"latitude":15.383238,"longitude":75.108885},{"latitude":15.383282,"longitude":75.108851},{"latitude":15.383422,"longitude":75.108739},{"latitude":15.383825,"longitude":75.108456},{"latitude":15.384081,"longitude":75.108275},{"latitude":15.384358,"longitude":75.108098},{"latitude":15.384523,"longitude":75.107991},{"latitude":15.385028,"longitude":75.107593},{"latitude":15.385106,"longitude":75.107527},{"latitude":15.385323,"longitude":75.107332},{"latitude":15.385553,"longitude":75.107092},{"latitude":15.385619,"longitude":75.107011},{"latitude":15.385859,"longitude":75.10673},{"latitude":15.386116,"longitude":75.106395},{"latitude":15.386477,"longitude":75.105938},{"latitude":15.386838,"longitude":75.105449},{"latitude":15.387087,"longitude":75.105107},{"latitude":15.387337,"longitude":75.104768},{"latitude":15.387427,"longitude":75.10466},{"latitude":15.387555,"longitude":75.10449},{"latitude":15.387594,"longitude":75.104437},{"latitude":15.387683,"longitude":75.104317},{"latitude":15.387872,"longitude":75.104048},{"latitude":15.388051,"longitude":75.10384},{"latitude":15.388182,"longitude":75.103693},{"latitude":15.388254,"longitude":75.103616},{"latitude":15.388461,"longitude":75.103392},{"latitude":15.3888,"longitude":75.102991},{"latitude":15.388893,"longitude":75.102885},{"latitude":15.388951,"longitude":75.102811},{"latitude":15.389126,"longitude":75.102586},{"latitude":15.389332,"longitude":75.102262},{"latitude":15.389487,"longitude":75.101982},{"latitude":15.389676,"longitude":75.101563},{"latitude":15.390036,"longitude":75.100764},{"latitude":15.390268,"longitude":75.100317},{"latitude":15.390391,"longitude":75.100068},{"latitude":15.390472,"longitude":75.099883},{"latitude":15.390503,"longitude":75.099796},{"latitude":15.390675,"longitude":75.09932},{"latitude":15.390954,"longitude":75.098659},{"latitude":15.390983,"longitude":75.098594},{"latitude":15.391165,"longitude":75.098172},{"latitude":15.391209,"longitude":75.098084},{"latitude":15.391255,"longitude":75.097991},{"latitude":15.391284,"longitude":75.097932},{"latitude":15.391521,"longitude":75.097389},{"latitude":15.391564,"longitude":75.097277},{"latitude":15.391855,"longitude":75.096631},{"latitude":15.392002,"longitude":75.096316},{"latitude":15.39214,"longitude":75.096029},{"latitude":15.392203,"longitude":75.095894},{"latitude":15.392236,"longitude":75.095826},{"latitude":15.392345,"longitude":75.095572},{"latitude":15.392913,"longitude":75.094255},{"latitude":15.393083,"longitude":75.093785},{"latitude":15.393112,"longitude":75.093684},{"latitude":15.393221,"longitude":75.093311},{"latitude":15.393486,"longitude":75.092266},{"latitude":15.393877,"longitude":75.090687},{"latitude":15.393986,"longitude":75.090242},{"latitude":15.39416,"longitude":75.089631},{"latitude":15.39424,"longitude":75.089259},{"latitude":15.394283,"longitude":75.08906},{"latitude":15.39444,"longitude":75.088318},{"latitude":15.394502,"longitude":75.088012},{"latitude":15.394588,"longitude":75.087582},{"latitude":15.39464,"longitude":75.087267},{"latitude":15.394676,"longitude":75.087005},{"latitude":15.394715,"longitude":75.086744},{"latitude":15.394755,"longitude":75.086569},{"latitude":15.394777,"longitude":75.086412},{"latitude":15.394801,"longitude":75.086271},{"latitude":15.394815,"longitude":75.086185},{"latitude":15.394822,"longitude":75.086144},{"latitude":15.394832,"longitude":75.086087},{"latitude":15.394838,"longitude":75.086048},{"latitude":15.394876,"longitude":75.085852},{"latitude":15.394921,"longitude":75.085655},{"latitude":15.394976,"longitude":75.085451},{"latitude":15.39504,"longitude":75.085274},{"latitude":15.395127,"longitude":75.085118},{"latitude":15.395305,"longitude":75.084835},{"latitude":15.395331,"longitude":75.084797},{"latitude":15.395413,"longitude":75.084674},{"latitude":15.395861,"longitude":75.084108},{"latitude":15.39623,"longitude":75.083601},{"latitude":15.396417,"longitude":75.083343},{"latitude":15.396576,"longitude":75.083123},{"latitude":15.396827,"longitude":75.082763},{"latitude":15.397035,"longitude":75.082458},{"latitude":15.397092,"longitude":75.082374},{"latitude":15.397302,"longitude":75.082072},{"latitude":15.397506,"longitude":75.081772},{"latitude":15.397788,"longitude":75.081322},{"latitude":15.398071,"longitude":75.080827},{"latitude":15.398158,"longitude":75.080678},{"latitude":15.398519,"longitude":75.080064},{"latitude":15.398644,"longitude":75.07988},{"latitude":15.398876,"longitude":75.079526},{"latitude":15.399198,"longitude":75.079075},{"latitude":15.399395,"longitude":75.078805},{"latitude":15.399597,"longitude":75.078534},{"latitude":15.399792,"longitude":75.078258},{"latitude":15.399912,"longitude":75.078089},{"latitude":15.399967,"longitude":75.078013},{"latitude":15.400075,"longitude":75.077864},{"latitude":15.400202,"longitude":75.077689},{"latitude":15.40024,"longitude":75.077636},{"latitude":15.400441,"longitude":75.077351},{"latitude":15.400614,"longitude":75.077105},{"latitude":15.40079,"longitude":75.076871},{"latitude":15.400961,"longitude":75.076629},{"latitude":15.401252,"longitude":75.076219},{"latitude":15.401419,"longitude":75.075987},{"latitude":15.401497,"longitude":75.075881},{"latitude":15.401793,"longitude":75.075458},{"latitude":15.401994,"longitude":75.075168},{"latitude":15.402251,"longitude":75.074745},{"latitude":15.402408,"longitude":75.074468},{"latitude":15.402793,"longitude":75.073693},{"latitude":15.402996,"longitude":75.073253},{"latitude":15.403077,"longitude":75.073093},{"latitude":15.403244,"longitude":75.072761},{"latitude":15.403541,"longitude":75.072162},{"latitude":15.403691,"longitude":75.071857},{"latitude":15.403738,"longitude":75.071766},{"latitude":15.40397,"longitude":75.071295},{"latitude":15.404146,"longitude":75.070929},{"latitude":15.404315,"longitude":75.070601},{"latitude":15.404481,"longitude":75.070261},{"latitude":15.404928,"longitude":75.069362},{"latitude":15.405125,"longitude":75.068851},{"latitude":15.405135,"longitude":75.068823},{"latitude":15.405221,"longitude":75.068586},{"latitude":15.405485,"longitude":75.067869},{"latitude":15.405622,"longitude":75.067486},{"latitude":15.405751,"longitude":75.067123},{"latitude":15.405875,"longitude":75.066765},{"latitude":15.405915,"longitude":75.066632},{"latitude":15.406075,"longitude":75.066173},{"latitude":15.406104,"longitude":75.066092},{"latitude":15.4062,"longitude":75.065824},{"latitude":15.406366,"longitude":75.065435},{"latitude":15.406548,"longitude":75.06505},{"latitude":15.406591,"longitude":75.064962},{"latitude":15.406875,"longitude":75.064379},{"latitude":15.407072,"longitude":75.063869},{"latitude":15.40715,"longitude":75.063645},{"latitude":15.407215,"longitude":75.063429},{"latitude":15.4074,"longitude":75.062665},{"latitude":15.407494,"longitude":75.062458},{"latitude":15.407599,"longitude":75.062269},{"latitude":15.407884,"longitude":75.061911},{"latitude":15.40822,"longitude":75.061529},{"latitude":15.408508,"longitude":75.061261},{"latitude":15.408589,"longitude":75.061189},{"latitude":15.408793,"longitude":75.061006},{"latitude":15.409015,"longitude":75.060825},{"latitude":15.409241,"longitude":75.060653},{"latitude":15.409451,"longitude":75.060498},{"latitude":15.409743,"longitude":75.060287},{"latitude":15.410155,"longitude":75.059971},{"latitude":15.410474,"longitude":75.059735},{"latitude":15.410659,"longitude":75.05959},{"latitude":15.411198,"longitude":75.059183},{"latitude":15.411681,"longitude":75.058802},{"latitude":15.412053,"longitude":75.058444},{"latitude":15.412353,"longitude":75.058118},{"latitude":15.413134,"longitude":75.057223},{"latitude":15.413334,"longitude":75.056968},{"latitude":15.413537,"longitude":75.056719},{"latitude":15.413733,"longitude":75.056467},{"latitude":15.41392,"longitude":75.056212},{"latitude":15.414179,"longitude":75.055802},{"latitude":15.414377,"longitude":75.055425},{"latitude":15.414662,"longitude":75.054779},{"latitude":15.414899,"longitude":75.054157},{"latitude":15.415052,"longitude":75.053752},{"latitude":15.415207,"longitude":75.053392},{"latitude":15.415282,"longitude":75.05322},{"latitude":15.41538,"longitude":75.05299},{"latitude":15.415455,"longitude":75.05281},{"latitude":15.415523,"longitude":75.052645},{"latitude":15.415899,"longitude":75.051673},{"latitude":15.416116,"longitude":75.051083},{"latitude":15.416292,"longitude":75.050646},{"latitude":15.416748,"longitude":75.049439},{"latitude":15.416928,"longitude":75.048924},{"latitude":15.416958,"longitude":75.048832},{"latitude":15.417106,"longitude":75.048434},{"latitude":15.417285,"longitude":75.047927},{"latitude":15.417383,"longitude":75.04765},{"latitude":15.417479,"longitude":75.047355},{"latitude":15.417664,"longitude":75.046737},{"latitude":15.417702,"longitude":75.046374},{"latitude":15.417728,"longitude":75.045759},{"latitude":15.41775,"longitude":75.045145},{"latitude":15.417768,"longitude":75.044746},{"latitude":15.417775,"longitude":75.044595},{"latitude":15.417818,"longitude":75.044335},{"latitude":15.417852,"longitude":75.044125},{"latitude":15.417872,"longitude":75.044029},{"latitude":15.417975,"longitude":75.043521},{"latitude":15.418062,"longitude":75.043112},{"latitude":15.418126,"longitude":75.042825},{"latitude":15.418199,"longitude":75.042509},{"latitude":15.418344,"longitude":75.041875},{"latitude":15.418389,"longitude":75.041682},{"latitude":15.418426,"longitude":75.041498},{"latitude":15.418482,"longitude":75.04131},{"latitude":15.418531,"longitude":75.041165},{"latitude":15.418573,"longitude":75.041059},{"latitude":15.418602,"longitude":75.040984},{"latitude":15.4187,"longitude":75.040823},{"latitude":15.418878,"longitude":75.04055},{"latitude":15.419062,"longitude":75.040308},{"latitude":15.419265,"longitude":75.040068},{"latitude":15.41945,"longitude":75.039852},{"latitude":15.419626,"longitude":75.039641},{"latitude":15.419788,"longitude":75.039437},{"latitude":15.419874,"longitude":75.039322},{"latitude":15.420218,"longitude":75.038913},{"latitude":15.420519,"longitude":75.038547},{"latitude":15.420803,"longitude":75.038201},{"latitude":15.420952,"longitude":75.038016},{"latitude":15.421095,"longitude":75.037852},{"latitude":15.421232,"longitude":75.037701},{"latitude":15.421434,"longitude":75.037477},{"latitude":15.421602,"longitude":75.037305},{"latitude":15.421676,"longitude":75.037242},{"latitude":15.422022,"longitude":75.036975},{"latitude":15.422401,"longitude":75.036793},{"latitude":15.423064,"longitude":75.036529},{"latitude":15.423264,"longitude":75.036433},{"latitude":15.423764,"longitude":75.036225},{"latitude":15.424026,"longitude":75.036108},{"latitude":15.424692,"longitude":75.03585},{"latitude":15.424946,"longitude":75.035753},{"latitude":15.425344,"longitude":75.03559},{"latitude":15.425738,"longitude":75.035386},{"latitude":15.425904,"longitude":75.035309},{"latitude":15.426067,"longitude":75.035235},{"latitude":15.426221,"longitude":75.035151},{"latitude":15.426396,"longitude":75.035031},{"latitude":15.426423,"longitude":75.035012},{"latitude":15.426885,"longitude":75.034611},{"latitude":15.427161,"longitude":75.034311},{"latitude":15.427554,"longitude":75.033656},{"latitude":15.427802,"longitude":75.033208},{"latitude":15.428229,"longitude":75.032479},{"latitude":15.428666,"longitude":75.031848},{"latitude":15.429662,"longitude":75.031304},{"latitude":15.429861,"longitude":75.031093},{"latitude":15.430029,"longitude":75.030877},{"latitude":15.430042,"longitude":75.030841},{"latitude":15.43021,"longitude":75.030381},{"latitude":15.430638,"longitude":75.029169},{"latitude":15.430948,"longitude":75.02831},{"latitude":15.431054,"longitude":75.027972},{"latitude":15.431258,"longitude":75.02741},{"latitude":15.431444,"longitude":75.026866},{"latitude":15.431645,"longitude":75.026416},{"latitude":15.43229,"longitude":75.025563},{"latitude":15.432813,"longitude":75.024852},{"latitude":15.432965,"longitude":75.024645},{"latitude":15.433505,"longitude":75.023849},{"latitude":15.43379,"longitude":75.023418},{"latitude":15.433888,"longitude":75.023299},{"latitude":15.43416,"longitude":75.023047},{"latitude":15.434415,"longitude":75.022921},{"latitude":15.434889,"longitude":75.022739},{"latitude":15.435116,"longitude":75.022603},{"latitude":15.435372,"longitude":75.022366},{"latitude":15.435766,"longitude":75.021987},{"latitude":15.435894,"longitude":75.021832},{"latitude":15.435985,"longitude":75.02167},{"latitude":15.436096,"longitude":75.021353},{"latitude":15.436189,"longitude":75.021037},{"latitude":15.436296,"longitude":75.020697},{"latitude":15.436466,"longitude":75.020322},{"latitude":15.43656,"longitude":75.020152},{"latitude":15.436754,"longitude":75.01987},{"latitude":15.436944,"longitude":75.019629},{"latitude":15.437083,"longitude":75.019522},{"latitude":15.43712,"longitude":75.019494},{"latitude":15.437194,"longitude":75.019439},{"latitude":15.437652,"longitude":75.019091},{"latitude":15.438143,"longitude":75.018828},{"latitude":15.438421,"longitude":75.018646},{"latitude":15.438595,"longitude":75.018544},{"latitude":15.438961,"longitude":75.018312},{"latitude":15.439259,"longitude":75.018119},{"latitude":15.439485,"longitude":75.017984},{"latitude":15.439621,"longitude":75.017873},{"latitude":15.439912,"longitude":75.01764},{"latitude":15.440119,"longitude":75.017455},{"latitude":15.440338,"longitude":75.017234},{"latitude":15.440698,"longitude":75.016835},{"latitude":15.441033,"longitude":75.016496},{"latitude":15.441274,"longitude":75.016261},{"latitude":15.442125,"longitude":75.015465},{"latitude":15.442412,"longitude":75.015271},{"latitude":15.443122,"longitude":75.014473},{"latitude":15.443622,"longitude":75.013901},{"latitude":15.444129,"longitude":75.013472},{"latitude":15.44422,"longitude":75.01343},{"latitude":15.444809,"longitude":75.013155},{"latitude":15.445203,"longitude":75.013002},{"latitude":15.445905,"longitude":75.0126},{"latitude":15.446809,"longitude":75.012208},{"latitude":15.447135,"longitude":75.012124},{"latitude":15.447453,"longitude":75.011985},{"latitude":15.447631,"longitude":75.011933},{"latitude":15.448479,"longitude":75.011628},{"latitude":15.449044,"longitude":75.01139},{"latitude":15.449408,"longitude":75.011227},{"latitude":15.44988,"longitude":75.011015},{"latitude":15.450084,"longitude":75.010942},{"latitude":15.450239,"longitude":75.010911},{"latitude":15.450412,"longitude":75.010909},{"latitude":15.450589,"longitude":75.010912},{"latitude":15.450864,"longitude":75.010872},{"latitude":15.451039,"longitude":75.010826},{"latitude":15.451472,"longitude":75.010657},{"latitude":15.452116,"longitude":75.010436},{"latitude":15.452448,"longitude":75.010265},{"latitude":15.452618,"longitude":75.010156},{"latitude":15.452759,"longitude":75.010028},{"latitude":15.452951,"longitude":75.009812},{"latitude":15.453119,"longitude":75.009591},{"latitude":15.453266,"longitude":75.009386},{"latitude":15.453559,"longitude":75.008974},{"latitude":15.453668,"longitude":75.008827},{"latitude":15.453868,"longitude":75.008636},{"latitude":15.454073,"longitude":75.00836},{"latitude":15.454261,"longitude":75.008097},{"latitude":15.454388,"longitude":75.007897},{"latitude":15.454547,"longitude":75.007656},{"latitude":15.45465,"longitude":75.007484},{"latitude":15.454769,"longitude":75.007264},{"latitude":15.454821,"longitude":75.007196},{"latitude":15.454946,"longitude":75.007083},{"latitude":15.455101,"longitude":75.007009},{"latitude":15.455109,"longitude":75.007006},{"latitude":15.455359,"longitude":75.006959},{"latitude":15.456004,"longitude":75.006849},{"latitude":15.456193,"longitude":75.006817},{"latitude":15.45641,"longitude":75.006819},{"latitude":15.456734,"longitude":75.006877},{"latitude":15.456928,"longitude":75.006948},{"latitude":15.457516,"longitude":75.007189},{"latitude":15.457746,"longitude":75.007269},{"latitude":15.458457,"longitude":75.007523},{"latitude":15.458605,"longitude":75.007579},{"latitude":15.458721,"longitude":75.007636},{"latitude":15.458973,"longitude":75.007795},{"latitude":15.459081,"longitude":75.007874},{"latitude":15.459213,"longitude":75.008032},{"latitude":15.459701,"longitude":75.008558},{"latitude":15.460236,"longitude":75.008908},{"latitude":15.460273,"longitude":75.009009},{"latitude":15.460295,"longitude":75.009053},{"latitude":15.460311,"longitude":75.009093},{"latitude":15.460329,"longitude":75.009172},{"latitude":15.460329,"longitude":75.009242},{"latitude":15.46033,"longitude":75.009311},{"latitude":15.460315,"longitude":75.009376},{"latitude":15.460289,"longitude":75.009467},{"latitude":15.460245,"longitude":75.009514}];
