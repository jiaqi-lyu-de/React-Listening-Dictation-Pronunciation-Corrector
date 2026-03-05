import re

with open('src/App.css', 'r') as f:
    content = f.read()

def extract_section(start_comment, end_comment=None):
    if end_comment:
        pattern = r'(/\* ' + start_comment + r' \*/.*?)(?=/\* ' + end_comment + r' \*/)'
    else:
        # Last section or specific logic, but wait, we can just split by comments.
        pass

# It's better to just slice by strings because the format is very predictable.

sections = [
    ('AudioControls', '/* Audio Controls */', '/* Progress Bar */'),
    ('ProgressBar', '/* Progress Bar */', '/* Practice Section (DiffCom) */'),
    ('DiffCom', '/* Practice Section (DiffCom) */', '/* Transcripts */'),
    ('Transcripts', '/* Transcripts */', '/* Animations */'),
    ('DiffHistory', '/* Diff History Component */', '/* Speech Recorder Component */'),
    ('SpeechRecorder', '/* Speech Recorder Component */', '/* Pronunciation Results */'),
    ('PronunciationResults', '/* Pronunciation Results */', '/* Responsive Design for Pronunciation Assessment */'),
    ('PronunciationResponsive', '/* Responsive Design for Pronunciation Assessment */', '/* Single Word Recording State */'),
    ('SingleWordRecording', '/* Single Word Recording State */', None)
]

extracted = {}
remaining = content

def get_block(start_marker, end_marker):
    start_idx = remaining.find(start_marker)
    if start_idx == -1: return "", remaining
    if end_marker:
        end_idx = remaining.find(end_marker, start_idx)
        if end_idx == -1: end_idx = len(remaining)
    else:
        end_idx = len(remaining)
    block = remaining[start_idx:end_idx]
    new_remaining = remaining[:start_idx] + remaining[end_idx:]
    return block.strip(), new_remaining

blocks = {}
for name, start_marker, end_marker in sections:
    block, remaining = get_block(start_marker, end_marker)
    blocks[name] = block

# Assign to files
files_to_write = {
    'src/components/AudioControls/AudioControls.css': blocks['AudioControls'],
    'src/components/ProgressBar/ProgressBar.css': blocks['ProgressBar'],
    'src/components/DiffCom/DiffCom.css': blocks['DiffCom'] + '\n\n' + blocks['PronunciationResults'] + '\n\n' + blocks['PronunciationResponsive'] + '\n\n' + blocks['SingleWordRecording'],
    'src/components/Transcripts/Transcripts.css': blocks['Transcripts'],
    'src/components/DiffHistory/DiffHistory.css': blocks['DiffHistory'],
    'src/components/SpeechRecorder/SpeechRecorder.css': blocks['SpeechRecorder'],
}

for path, data in files_to_write.items():
    with open(path, 'w') as f:
        f.write(data + '\n')

with open('src/App.css', 'w') as f:
    f.write(remaining)

print("CSS extraction complete.")
