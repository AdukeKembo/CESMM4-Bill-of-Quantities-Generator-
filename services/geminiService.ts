
import { GoogleGenAI, Type } from "@google/genai";
import { BoQItem, UploadedFile } from '../types';

// This represents the raw object returned by the API before we process it
type GeneratedBoQItem = Omit<BoQItem, 'originalPrice' | 'revisedQuantity' | 'revisedPrice' | 'savings' | 'comments'> & { quantity: number | string, rate: number | string };

// Lazily initialize the AI client to prevent app crash on load if API key is missing.
let ai: GoogleGenAI | null = null;
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    if (!process.env.API_KEY) {
        // This error will now be caught by the handler in App.tsx and displayed in the UI.
        throw new Error("API_KEY environment variable not set. Please ensure it is configured correctly.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
};


const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            itemNumber: {
                type: Type.STRING,
                description: "The CESMM4 classification code for the work item (e.g., 'E.4.1.2' or 'E412').",
            },
            description: {
                type: Type.STRING,
                description: "The detailed description of the work item as per CESMM4 guidelines.",
            },
            unit: {
                type: Type.STRING,
                description: "The unit of measurement (e.g., 'm3', 'm', 'nr', 't').",
            },
            quantity: {
                type: Type.NUMBER,
                description: "The calculated quantity for the work item.",
            },
            rate: {
                type: Type.NUMBER,
                description: "A realistic, market-based rate as a current engineer's estimate for the work item in KES."
            }
        },
        required: ["itemNumber", "description", "unit", "quantity", "rate"],
    },
};

const CESMM4_CONTEXT = `
CESMM4 CLASSIFICATION RULES & TABLES:

CLASS A: GENERAL ITEMS
1 Contractual requirements (Performance bond, Insurances)
2 Specified requirements (Offices, Labs, Equipment)
3 Method-Related Charges (Accommodation, Plant, Temporary works)
4 Provisional Sums
5 Nominated Sub-contracts

CLASS B: GROUND INVESTIGATION
1 Trial pits/trenches
2 Light cable percussion boreholes
3 Rotary drilled boreholes
4 Samples
5 Site tests (Permeability, Penetration, Vane, Plate bearing)
6 Instrumental observations
7 Laboratory tests
8 Professional services

CLASS C: GEOTECHNICAL & SPECIALIST
1 Drilling for grout
2 Grouting
3 Diaphragm walls
4 Ground reinforcement (Tendons, Anchors)
5 Sand/band/wick drains
6 Vibro floatation

CLASS D: DEMOLITION & SITE CLEARANCE
1 General clearance (ha)
2 Trees (Girth zones: 500mm-1m, >1m etc.) (nr)
3 Stumps (Diameter zones: <150mm etc.) (nr)
4 Buildings (sum)
5 Other structures (sum)
6 Pipelines (m)

CLASS E: EARTHWORKS
1 Dredging (m3)
2 Cuttings (m3) (Topsoil, Material other than topsoil/rock, Rock, Concrete)
3 Foundations (m3)
4 General excavation (m3)
5 Excavation ancillaries (Trimming m2, Preparation m2, Disposal m3, Double handling m3)
6 Filling (m3) (To structures, Embankments, General)
7 Filling ancillaries (Trimming m2, Geotextiles m2)
8 Landscaping (Turfing m2, Hydraulic mulch m2, Plants nr)
*Depth zones for excavation: <0.25m, 0.25-0.5, 0.5-1, 1-2, 2-5, 5-10...

CLASS F: IN SITU CONCRETE
1 Provision (Designed mix) (C10, C20, C25, C30...) (m3)
2 Provision (Prescribed mix) (m3)
4 Placing (Mass) (Blinding, Bases, Walls...) (m3)
5 Placing (Reinforced) (Bases, Suspended slabs, Walls, Beams, Columns) (m3)
6 Placing (Prestressed) (m3)

CLASS G: CONCRETE ANCILLARIES
1 Formwork (Rough finish) (m2) (Plane horizontal, sloping, vertical, curved)
2 Formwork (Fair finish) (m2)
5 Reinforcement (t) (Plain round, Deformed high yield, Stainless) (Sizes: 6, 8, 10, 12, 16, 20, 25, 32mm)
6 Joints (Open, Formed, Plastics/Rubber waterstops) (m)
7 Post-tensioned prestressing
8 Accessories (Finishing, Inserts, Grouting)

CLASS H: PRECAST CONCRETE
1 Beams (Length/Mass categories) (nr)
5 Slabs (Area categories) (nr)
6 Segmental units
7 Units for subways/culverts
8 Copings/sills (Cross-sectional area) (m)

CLASS I: PIPEWORK - PIPES
1st Div (Material): 1 Clay, 2 Concrete, 3 Iron, 4 Steel, 5 PVC, 6 GRP, 7 HDPE, 8 MDPE
2nd Div (Bore): 1 <200, 2 200-300, 3 300-600, 4 600-900, 5 900-1200, 6 1200-1500, 7 1500-1800, 8 >1800
3rd Div (Depth): 1 Not in trench, 2 <1.5m, 3 1.5-2, 4 2-2.5, 5 2.5-3, 6 3-3.5, 7 3.5-4, 8 >4m
Unit: m

CLASS J: PIPEWORK - FITTINGS & VALVES
1st Div (Material): Same as Class I
2nd Div: 1 Bends, 2 Junctions, 3 Tapers, 4 Double collars, 6 Glands, 7 Bellmouths
3rd Div (Bore): Same as Class I
Unit: nr

CLASS K: MANHOLES & ANCILLARIES
1 Manholes (Brick, Concrete, Precast) (nr)
2 Other chambers (nr)
3 Gullies (nr)
4 French drains (m)
5 Ducts/Metal culverts (m)
6 Crossings (River, Hedge, Wall, Sewer) (nr)
7 Reinstatement (m)

CLASS L: SUPPORTS & PROTECTION
1 Extras to excavation (Rock, Mass concrete...) (m3)
2 Excavation extras (Backfilling)
3 Beds (Sand, Concrete) (m)
4 Haunches (m)
5 Surrounds (m)
6 Wrapping/Lagging (m)
7 Concrete stools (nr)
8 Isolated supports (nr)

CLASS M: STRUCTURAL METALWORK
1 Main members (Rolled, Plates, Hollow) (t)
2 Subsidiary members (t)
3 Framings (t)
4 Erection (Trial, Permanent) (t)
8 Off site surface treatment (m2)

CLASS N: MISC METALWORK
1 Stairs/Landings (t)
2 Walkways (t)
3 Ladders (m)
4 Handrails (m)
6 Framing (m)
7 Flooring (m2)
1 Cladding (m2)
4 Tie rods (nr)
6 Bridge bearings (nr)
7 Tanks (nr)

CLASS O: TIMBER
1 Hardwood components (m)
2 Softwood components (m)
3 Hardwood decking (m2)
4 Softwood decking (m2)
5 Fittings (nr)

CLASS P: PILES
1 Bored cast in place (m) (Diameter zones: 300, 600, 900...)
2 Driven cast in place (m)
3 Preformed concrete (m)
4 Preformed concrete sheets (m2)
5 Timber (m)
6 Isolated steel (m) (Mass kg/m)
7 Interlocking steel (m2)

CLASS Q: PILING ANCILLARIES
1 Cast in place (Pre-boring, Backfilling, Perm casings, Enlarged bases...)
3 Preformed concrete (Pre-boring, Jetting, Extensions...)
7 Obstructions (h)
8 Pile tests (nr)

CLASS R: ROADS & PAVINGS
1 Unbound sub-base (m3)
2 Cement bound (m3)
3 Slag/Ash (m2)
4 Bituminous bound (m2)
5 Concrete pavements (m3)
6 Joints (m)
7 Kerbs/Channels (m)
8 Ancillaries (Traffic signs, Markings)

CLASS S: RAIL TRACK
1 Foundations (Ballast m3, Blinding m2)
2 Taking up (m)
3 Lifting/Packing (m)
4 Supplying (Bullhead/Flat bottom rails t, Sleepers nr, Fittings nr)
5 Supplying (Turnouts nr)
6 Laying (m)
7 Laying turnouts (nr)

CLASS T: TUNNELS
1 Excavation (m3) (Rock, Soft)
2 In situ lining (m2)
5 Preformed segmental lining (nr)
7 Excavated surfaces (m2)
8 Support/Stabilization (Rock bolts m, Arches t, Mesh m2, Grouting)

CLASS U: BRICKWORK/MASONRY
1 Common brickwork
2 Facing brickwork
3 Engineering brickwork
(Div 2: Thickness. Div 3: Vertical, Battered, Curved...)
Unit: m2

CLASS V: PAINTING
1 Iron/Zinc primer
2 Etch primer
3 Oil paint
4 Alkyd gloss
5 Emulsion
...
Unit: m2 or nr (isolated groups)

CLASS W: WATERPROOFING
1 Damp proofing (Asphalt, Sheet metal...) (m2)
2 Tanking
3 Roofing
4 Protective layers
5 Sprayed/Brushed
6 Sheet linings

CLASS X: MISC WORK
1 Fences (Timber, Wire, Concrete, Metal) (m)
2 Gates/Stiles (nr)
3 Drainage to structures (Gutters m, Fittings nr)
4 Gabions (Box, Mattress) (nr or m3)

CLASS Y: SEWER RENOVATION
1 Cleaning (m)
2 Removing intrusions (nr)
3 CCTV surveys (m)
4 Plugging laterals (nr)
5 Filling laterals (m3)
6 Local repairs (nr)

CLASS Z: BUILDING WORKS
1 Carpentry (Floors, Walls, Roofs) (m/m2/nr)
2 Insulation (m2)
3 Windows/Doors (nr)
4 Finishes (m2)
5 Ceilings (m2)
6 Raised floors (m2)
7 Partitions (m2)
8 Panel cubicles (nr)
5 Piped services (Pipes m, Equipment nr, Sanitary nr)
6 Ducted services (Ductwork m, Equipment nr)
7 Cabled services (Cable m, Conduits m, Trunking m, Equipment nr)

CODING RULE: [Class Letter][1st Div][2nd Div][3rd Div]. Example: E123.
`;

export async function generateBoq(projectDescription: string, files: UploadedFile[] = []): Promise<GeneratedBoQItem[]> {
  const prompt = `
    You are an expert Quantity Surveyor specializing in the Civil Engineering Standard Method of Measurement, Fourth Edition (CESMM4). 
    Your task is to generate a Bill of Quantities (BoQ) based on the provided project description and any attached drawings, maps, or design documents.

    Strictly adhere to the CESMM4 classification system, measurement rules, and item descriptions. For each work item you identify, you must provide:
    1. The correct CESMM4 item number (Class + 3 digits) based on the provided classification tables.
    2. A detailed description that complies with CESMM4 requirements.
    3. The appropriate unit of measurement (e.g., m, m2, m3, nr, t).
    4. The calculated quantity based on the dimensions and information given.
    5. A realistic, market-based rate as a current engineer's estimate for the work in Kenyan Shillings (KES).

    REFERENCE - CESMM4 CLASSIFICATION TABLES:
    ${CESMM4_CONTEXT}

    Analyze the following project description and the attached documents (if any) to generate the corresponding BoQ items. 
    Pay close attention to any engineering drawings, layout maps, or handwritten notes in the attachments.
    ---
    PROJECT DESCRIPTION:
    ${projectDescription}
    ---

    Generate the output as a JSON object that strictly conforms to the provided schema. Do not generate prices, only quantities and rates.
  `;

  // Construct parts for multimodal input
  const parts: any[] = [{ text: prompt }];

  // Append file parts if they exist
  if (files && files.length > 0) {
      files.forEach(file => {
          parts.push({
              inlineData: {
                  mimeType: file.mimeType,
                  data: file.data
              }
          });
      });
  }

  // The try/catch is handled by the calling function in App.tsx
  const aiClient = getAiClient();
  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1, // Lower temperature for more deterministic, rule-based output
    },
  });

  const jsonText = response.text.trim();
  const parsedJson = JSON.parse(jsonText);

  // Basic validation
  if (!Array.isArray(parsedJson)) {
      throw new Error("API did not return a valid array for BoQ items.");
  }

  return parsedJson as GeneratedBoQItem[];
}
