"""
Generates placeholder pet-mood PNGs for every mood in src/data/moods.js,
styled in Pawse's cream/brown palette (matching the Figma reference).
These are stand-ins until real art is drawn for each mood - same cat
head shape every time, only the eyes/mouth/extras change, so swapping
in real art later is a 1:1 file replacement with no code changes needed.
"""
import cairosvg

OUT_DIR = "."
CREAM = "#F3E3CC"
BROWN = "#6B4F3A"
WHITE = "#FFFFFF"
PINK = "#F0A8C4"

HEAD = '<path d="M 100 50 L 78 14 L 70 48 Q 40 46 28 76 Q 18 100 28 124 Q 40 156 100 160 Q 160 156 172 124 Q 182 100 172 76 Q 160 46 130 48 L 122 14 Z" fill="{fill}" stroke="{stroke}" stroke-width="4"/>'

FACES = {
    "happy": '<path d="M 76 98 L 82 88 L 88 98 L 98 100 L 88 102 L 82 112 L 76 102 L 66 100 Z" fill="{b}"/><path d="M 112 98 L 118 88 L 124 98 L 134 100 L 124 102 L 118 112 L 112 102 L 102 100 Z" fill="{b}"/><path d="M 84 130 Q 100 142 116 130" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "overjoyed": '<path d="M 68 94 L 78 84 L 88 94 L 98 100 L 88 106 L 78 116 L 68 106 L 58 100 Z" fill="{p}"/><path d="M 102 94 L 112 84 L 122 94 L 132 100 L 122 106 L 112 116 L 102 106 L 92 100 Z" fill="{p}"/><path d="M 78 128 Q 100 148 122 128" stroke="{b}" stroke-width="6" stroke-linecap="round" fill="none"/>',
    "miss_you": '<circle cx="82" cy="100" r="8" fill="{b}"/><circle cx="118" cy="100" r="8" fill="{b}"/><path d="M 88 132 Q 100 124 112 132" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "in_love": '<path d="M 74 96 Q 82 88 90 96 Q 82 106 74 96 Z" fill="{p}"/><path d="M 110 96 Q 118 88 126 96 Q 118 106 110 96 Z" fill="{p}"/><path d="M 84 130 Q 100 140 116 130" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "love_overdose": '<path d="M 70 92 Q 82 80 94 92 Q 82 108 70 92 Z" fill="{p}"/><path d="M 106 92 Q 118 80 130 92 Q 118 108 106 92 Z" fill="{p}"/><path d="M 80 128 Q 100 144 120 128" stroke="{b}" stroke-width="6" stroke-linecap="round" fill="none"/>',
    "cozy": '<path d="M 70 100 Q 82 94 94 100" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 106 100 Q 118 94 130 100" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 90 126 Q 100 132 110 126" stroke="{b}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    "sad": '<circle cx="82" cy="100" r="8" fill="{b}"/><circle cx="118" cy="100" r="8" fill="{b}"/><path d="M 82 112 Q 76 124 82 134 Q 88 138 90 130 Q 88 120 82 112 Z" fill="{b}"/><path d="M 88 138 Q 100 130 112 138" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "frustrated": '<path d="M 72 100 L 92 100" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 108 100 L 128 100" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 82 130 Q 88 124 94 130 Q 100 136 106 130 Q 112 124 118 130" stroke="{b}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    "angry": '<path d="M 72 92 L 92 100" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 128 92 L 108 100" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 80 130 L 120 130" stroke="{b}" stroke-width="6" stroke-linecap="round"/>',
    "on_fire": '<circle cx="82" cy="100" r="9" fill="{b}"/><circle cx="118" cy="100" r="9" fill="{b}"/><path d="M 82 130 Q 90 122 100 130 Q 110 138 118 130" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "evil": '<path d="M 72 94 L 92 102" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 128 94 L 108 102" stroke="{b}" stroke-width="6" stroke-linecap="round"/><path d="M 82 128 Q 100 138 118 128" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "naughty": '<path d="M 74 96 Q 84 90 94 98" stroke="{b}" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="118" cy="100" r="8" fill="{b}"/><path d="M 86 128 Q 100 136 114 126" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "hungry": '<circle cx="82" cy="100" r="9" fill="{b}"/><circle cx="118" cy="100" r="9" fill="{b}"/><ellipse cx="100" cy="132" rx="10" ry="8" fill="{b}"/>',
    "shocked": '<circle cx="82" cy="100" r="10" fill="{w}" stroke="{b}" stroke-width="3"/><circle cx="118" cy="100" r="10" fill="{w}" stroke="{b}" stroke-width="3"/><ellipse cx="100" cy="132" rx="7" ry="9" fill="{b}"/>',
    "scared": '<circle cx="82" cy="98" r="9" fill="{w}" stroke="{b}" stroke-width="3"/><circle cx="118" cy="98" r="9" fill="{w}" stroke="{b}" stroke-width="3"/><path d="M 88 130 Q 100 124 112 130" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "confused": '<circle cx="82" cy="96" r="8" fill="{b}"/><path d="M 106 98 Q 118 90 130 98" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 90 130 Q 100 126 108 132 Q 100 136 92 132" stroke="{b}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    "laughy": '<path d="M 72 98 Q 82 90 92 98" stroke="{b}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M 108 98 Q 118 90 128 98" stroke="{b}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M 80 124 Q 100 144 120 124" fill="{b}"/>',
    "silly": '<circle cx="82" cy="98" r="8" fill="{b}"/><path d="M 108 100 Q 118 94 130 100" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 84 128 Q 100 138 116 126" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/>',
    "cutesy": '<circle cx="82" cy="100" r="9" fill="{b}"/><circle cx="118" cy="100" r="9" fill="{b}"/><circle cx="70" cy="116" r="8" fill="{p}" opacity="0.6"/><circle cx="130" cy="116" r="8" fill="{p}" opacity="0.6"/><path d="M 88 130 Q 100 136 112 130" stroke="{b}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    "exhausted": '<path d="M 70 102 L 94 102" stroke="{b}" stroke-width="5" stroke-linecap="round"/><path d="M 106 102 L 130 102" stroke="{b}" stroke-width="5" stroke-linecap="round"/><path d="M 86 132 Q 100 128 114 132" stroke="{b}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    "sleepy": '<path d="M 70 104 Q 82 98 94 104" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 106 104 Q 118 98 130 104" stroke="{b}" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="100" cy="132" rx="7" ry="5" fill="{b}"/>',
}

for mood_id, face_svg in FACES.items():
    svg = f'<svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
    svg += HEAD.format(fill=CREAM, stroke=BROWN)
    svg += face_svg.format(b=BROWN, w=WHITE, p=PINK)
    svg += "</svg>"
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"{OUT_DIR}/{mood_id}.png", output_width=300, output_height=300)

# Generic placeholder (used if a mood's image is missing entirely)
placeholder = f'<svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
placeholder += HEAD.format(fill=CREAM, stroke=BROWN)
placeholder += f'<circle cx="82" cy="100" r="8" fill="{BROWN}"/><circle cx="118" cy="100" r="8" fill="{BROWN}"/>'
placeholder += "</svg>"
cairosvg.svg2png(bytestring=placeholder.encode(), write_to=f"{OUT_DIR}/placeholder.png", output_width=300, output_height=300)

print(f"Generated {len(FACES)} mood images + 1 placeholder")
