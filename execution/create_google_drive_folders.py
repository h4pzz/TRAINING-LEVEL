#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Drive Folder Structure Provisioner for AeroCheck Training Level
Creates:
  Training level/
    ├── Flight Crew/
    │   └── [LastName_FirstName]/ (149 folders)
    └── Cabin crew/
        └── [LastName_FirstName]/ (47 folders)
"""

import sys
import os
import json
import zipfile
import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET

EXCEL_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'DATABASE', 'Training_level_FLIGHT_and CABIN.xlsx')

def parse_crew_names_from_excel(excel_path):
    """Extracts flight and cabin crew names from the company Excel database."""
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel database not found at: {excel_path}")
        
    archive = zipfile.ZipFile(excel_path)
    sst_root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
    shared_strings = [t.text for t in sst_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
    
    def extract_sheet_names(sheet_path, header_row, col_letter):
        sheet_xml = archive.read(sheet_path)
        root = ET.fromstring(sheet_xml)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        names = []
        for r in root.findall('.//ns:row', ns):
            row_id = int(r.attrib.get('r', 0))
            if row_id <= header_row:
                continue
            for c in r.findall('ns:c', ns):
                ref = c.attrib.get('r', '')
                col = ''.join([ch for ch in ref if ch.isalpha()])
                if col == col_letter:
                    t = c.attrib.get('t')
                    v = c.find('ns:v', ns)
                    val = v.text if v is not None else ''
                    if t == 's' and val:
                        val = shared_strings[int(val)]
                    val = val.strip()
                    if val:
                        names.append(val)
        return names

    flight_names = extract_sheet_names('xl/worksheets/sheet1.xml', 4, 'E')
    cabin_names = extract_sheet_names('xl/worksheets/sheet2.xml', 2, 'G')
    
    return flight_names, cabin_names

def format_crew_folder_name(full_name_en):
    """Converts 'LastName FirstName' into 'LastName_FirstName' replacing illegal characters."""
    clean = full_name_en.strip()
    for ch in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']:
        clean = clean.replace(ch, '')
    parts = clean.split()
    return '_'.join(parts)

def drive_api_request(url, method='GET', data=None, token=None):
    """Makes an HTTPS request to Google Drive API v3."""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json; charset=utf-8'
    }
    encoded_data = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        raise RuntimeError(f"Google Drive API error ({e.code}): {err_msg}")

def find_or_create_folder(folder_name, parent_id, token):
    """Finds an existing folder or creates it under parent_id in Google Drive."""
    safe_name = folder_name.replace("'", "\\'")
    query = f"name = '{safe_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    
    encoded_q = urllib.parse.quote(query)
    search_url = f"https://www.googleapis.com/drive/v3/files?q={encoded_q}&fields=files(id,name,webViewLink)&pageSize=1"
    
    search_res = drive_api_request(search_url, token=token)
    if search_res.get('files'):
        return search_res['files'][0]
        
    create_body = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        create_body['parents'] = [parent_id]
        
    create_url = "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink"
    return drive_api_request(create_url, method='POST', data=create_body, token=token)

def provision_drive_folders(token):
    """Main provisioning routine."""
    print("Reading crew members from Excel database...")
    flight_names, cabin_names = parse_crew_names_from_excel(EXCEL_DB_PATH)
    print(f"Found: {len(flight_names)} Flight Crew, {len(cabin_names)} Cabin Crew.")
    
    total = len(flight_names) + len(cabin_names) + 3
    current = 0
    
    print("\n[1/3] Creating/Checking root folder: 'Training level'...")
    root_folder = find_or_create_folder('Training level', None, token)
    current += 1
    print(f" -> Root Folder ID: {root_folder['id']} ({root_folder.get('webViewLink', '')})")
    
    print("\n[2/3] Creating/Checking subfolder: 'Flight Crew'...")
    flight_folder = find_or_create_folder('Flight Crew', root_folder['id'], token)
    current += 1
    print(f" -> Flight Crew Folder ID: {flight_folder['id']}")
    
    print("\n[3/3] Creating/Checking subfolder: 'Cabin crew'...")
    cabin_folder = find_or_create_folder('Cabin crew', root_folder['id'], token)
    current += 1
    print(f" -> Cabin crew Folder ID: {cabin_folder['id']}")
    
    print("\nProvisioning individual Flight Crew folders...")
    flight_results = []
    for name in flight_names:
        folder_name = format_crew_folder_name(name)
        current += 1
        print(f" [{current}/{total}] Flight Crew / {folder_name}...", end='\r')
        res = find_or_create_folder(folder_name, flight_folder['id'], token)
        flight_results.append({'name': folder_name, 'id': res['id'], 'link': res.get('webViewLink')})
        
    print(f"\nCompleted {len(flight_results)} Flight Crew folders.")
    
    print("\nProvisioning individual Cabin Crew folders...")
    cabin_results = []
    for name in cabin_names:
        folder_name = format_crew_folder_name(name)
        current += 1
        print(f" [{current}/{total}] Cabin crew / {folder_name}...", end='\r')
        res = find_or_create_folder(folder_name, cabin_folder['id'], token)
        cabin_results.append({'name': folder_name, 'id': res['id'], 'link': res.get('webViewLink')})
        
    print(f"\nCompleted {len(cabin_results)} Cabin Crew folders.")
    
    summary = {
        'rootFolder': root_folder,
        'flightFolder': flight_folder,
        'cabinFolder': cabin_folder,
        'flightCount': len(flight_results),
        'cabinCount': len(cabin_results),
        'flightFolders': flight_results,
        'cabinFolders': cabin_results
    }
    
    out_path = os.path.join(os.path.dirname(__file__), '..', '.tmp', 'google_drive_structure.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    print("\n=======================================================")
    print("SUCCESS! Google Drive folder structure fully provisioned:")
    print(f"Root: Training level -> {root_folder.get('webViewLink')}")
    print(f"Flight Crew folders: {len(flight_results)}")
    print(f"Cabin crew folders: {len(cabin_results)}")
    print(f"Registry saved to: {out_path}")
    print("=======================================================")
    return summary

if __name__ == '__main__':
    # Token can be passed as first argument or from GOOGLE_ACCESS_TOKEN env variable
    access_token = sys.argv[1] if len(sys.argv) > 1 else os.getenv('GOOGLE_ACCESS_TOKEN')
    if not access_token:
        print("Usage: python create_google_drive_folders.py <GOOGLE_ACCESS_TOKEN>")
        print("Or set environment variable: GOOGLE_ACCESS_TOKEN")
        sys.exit(1)
        
    try:
        provision_drive_folders(access_token)
    except Exception as err:
        print(f"\n[ERROR] Provisioning failed: {err}", file=sys.stderr)
        sys.exit(2)
