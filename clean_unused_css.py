import os
import re

def clean_css_project(src_dir):
    used_words = set()
    used_vars = set()
    
    print("Scanning .js and .jsx files for used class names and tokens...")
    # 1. Collect all words and variables
    for root, _, files in os.walk(src_dir):
        for file in files:
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                if file.endswith(('.js', '.jsx')):
                    # Extract all word-like strings (potential classes and IDs)
                    words = re.findall(r'[a-zA-Z0-9_-]+', content)
                    used_words.update(words)
                    
                if file.endswith(('.js', '.jsx', '.css')):
                    # Check for CSS custom property variables like var(--my-var)
                    vars_in_content = re.findall(r'var\(\s*(--[a-zA-Z0-9_-]+)\s*\)', content)
                    used_vars.update(vars_in_content)
            except Exception as e:
                print(f"Error reading {filepath}: {e}")

    # Standard tags that should always be kept
    always_keep = {
        'body', 'html', '*', ':root', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'p', 'div', 'span', 'ul', 'li', 'button', 'input', 'textarea', 'audio',
        'from', 'to', 'kbd'
    }
    used_words.update(always_keep)
    
    # We add common dynamic fragments potentially missed if constructed weirdly
    # (Though JSX parsing usually handles string literals well)
    
    print(f"Initial pass: Found {len(used_words)} unique word tokens and {len(used_vars)} used CSS variables.")

    # 2. Process each CSS file
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.css'):
                filepath = os.path.join(root, file)
                print(f"Optimizing {filepath}...")
                with open(filepath, 'r', encoding='utf-8') as f:
                    css_text = f.read()
                
                # Extract and replace CSS comments with placeholders
                comments = []
                def replace_comment(match):
                    placeholder = f"/* __COMMENT_{len(comments)}__ */"
                    comments.append(match.group(0))
                    return placeholder
                    
                css_text = re.sub(r'/\*.*?\*/', replace_comment, css_text, flags=re.DOTALL)
                
                # Filter unused variables from the CSS file
                lines = css_text.split('\n')
                new_lines = []
                for line in lines:
                    # Match variable declaration e.g. "--bg-primary: #fff;"
                    var_match = re.search(r'^\s*(--[a-zA-Z0-9_-]+)\s*:', line)
                    if var_match:
                        var_name = var_match.group(1)
                        if var_name not in used_vars:
                            # Skip this variable assignment
                            continue
                    new_lines.append(line)
                
                current_css = '\n'.join(new_lines)

                # Filter unused rule blocks using regex
                def replace_unused_blocks(match):
                    full_match = match.group(0)
                    selector_text = match.group(1).strip()
                    properties = match.group(2)
                    
                    # Ignore at-rules entirely except allowing their inner blocks to be processed
                    if selector_text.startswith('@'):
                        return full_match
                        
                    # Split comma-separated selectors (e.g. ".a, .b")
                    selectors = [s.strip() for s in selector_text.split(',')]
                    retained_selectors = []
                    
                    for sel in selectors:
                        # Find all classes and ids in this sub-selector
                        sel_classes_ids = re.findall(r'[.#]([a-zA-Z0-9_-]+)', sel)
                        
                        # A selector is considered used if ALL its classes/ids are in the used_words set
                        # To handle dynamic classes like `btn-${status}`, we also allow partial matches:
                        # if the class name starts with a used_word ending in '-' or '_'
                        is_used = True
                        for c in sel_classes_ids:
                            c_used = False
                            # Exact match
                            if c in used_words:
                                c_used = True
                            else:
                                # Partial matching for dynamic classes
                                # e.g. if 'btn-' is in used_words and c is 'btn-active'
                                # we check if any prefix of c is in used_words (has to end with - or _)
                                parts = re.split(r'(-|_)', c)
                                prefix = ""
                                for part in parts:
                                    prefix += part
                                    if prefix in used_words:
                                        c_used = True
                                        break
                            
                            if not c_used:
                                is_used = False
                                break
                                
                        if is_used:
                            retained_selectors.append(sel)
                            
                    if retained_selectors:
                        return f"{', '.join(retained_selectors)} {{{properties}}}"
                    else:
                        # The entire rule block is removed
                        return ""

                # Run replacement over simple brace blocks { ... } 
                # This inherently works from the inside out and avoids choking on @media wrappers
                previous_css = ""
                # Ensure we only iterate over innermost rules
                while previous_css != current_css:
                    previous_css = current_css
                    current_css = re.sub(r'([^{}]+)\{([^{}]*)\}', replace_unused_blocks, current_css)
                
                # Cleanup empty leftover brackets (like empty @media wrappers)
                current_css = re.sub(r'([^{}]*)\{\s*\}', '', current_css)
                # Run twice for nested empty media queries just in case
                current_css = re.sub(r'([^{}]*)\{\s*\}', '', current_css)

                # Restore comments
                def restore_comment(match):
                    idx = int(match.group(1))
                    if idx < len(comments):
                        return comments[idx]
                    return match.group(0)
                
                current_css = re.sub(r'/\* __COMMENT_(\d+)__ \*/', restore_comment, current_css)

                with open(filepath, 'w', encoding='utf-8') as f:
                    # Restore some sensible spacing
                    formatted_css = re.sub(r'\}\s*', '}\n\n', current_css.strip())
                    f.write(formatted_css + '\n')

if __name__ == "__main__":
    clean_css_project('./src')
    print("\n✅ CSS cleanup completed successfully.")
