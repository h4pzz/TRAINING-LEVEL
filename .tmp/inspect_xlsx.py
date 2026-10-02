import zipfile
import xml.etree.ElementTree as ET

archive = zipfile.ZipFile('DATABASE/Training_level_FLIGHT_and CABIN.xlsx')

# Load shared strings
shared_strings = []
try:
    sst_xml = archive.read('xl/sharedStrings.xml')
    sst_root = ET.fromstring(sst_xml)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    for t in sst_root.findall('.//ns:t', ns):
        shared_strings.append(t.text)
except KeyError:
    pass

def get_row_values(sheet_path):
    sheet_xml = archive.read(sheet_path)
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    
    rows = sheet_root.findall('.//ns:row', ns)
    if not rows:
        return []
    
    results = []
    for row in rows[:5]:
        row_num = row.attrib.get('r')
        row_cells = []
        for cell in row.findall('ns:c', ns):
            cell_ref = cell.attrib.get('r')
            cell_type = cell.attrib.get('t')
            val_elem = cell.find('ns:v', ns)
            val = val_elem.text if val_elem is not None else ''
            
            if cell_type == 's' and val:
                val = shared_strings[int(val)]
            row_cells.append((cell_ref, val))
        results.append((row_num, row_cells))
    return results

print("--- Flight Crew ---")
for r_num, cells in get_row_values('xl/worksheets/sheet1.xml'):
    print(r_num, [c[1] for c in cells])

print("--- Cabin Crew ---")
for r_num, cells in get_row_values('xl/worksheets/sheet2.xml'):
    print(r_num, [c[1] for c in cells])
