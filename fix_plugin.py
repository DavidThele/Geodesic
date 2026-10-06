import os
import uuid
import re

pbxproj_path = './ios/App/App.xcodeproj/project.pbxproj'
m_file_path = './ios/App/App/WidgetSyncPlugin.m'

# 1. Create the .m file
m_content = """#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetSyncPlugin, "WidgetSync",
    CAP_PLUGIN_METHOD(syncWidgetData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadTimelines, CAPPluginReturnPromise);
)
"""
with open(m_file_path, 'w') as f:
    f.write(m_content)

print("Created WidgetSyncPlugin.m")

# 2. Patch pbxproj
with open(pbxproj_path, 'r') as f:
    pbxproj_content = f.read()

if 'WidgetSyncPlugin.m' in pbxproj_content:
    print("WidgetSyncPlugin.m already in pbxproj.")
    exit(0)

def generate_id():
    return str(uuid.uuid4()).replace('-', '')[:24].upper()

fileRefId = generate_id()
buildFileId = generate_id()

# Add to PBXBuildFile
build_file_str = f"\\t\\t{buildFileId} /* WidgetSyncPlugin.m in Sources */ = {{isa = PBXBuildFile; fileRef = {fileRefId} /* WidgetSyncPlugin.m */; }};\\n"
pbxproj_content = re.sub(r'(/\* Begin PBXBuildFile section \*/\n)', r'\g<1>' + build_file_str, pbxproj_content)

# Add to PBXFileReference
file_ref_str = f"\\t\\t{fileRefId} /* WidgetSyncPlugin.m */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = WidgetSyncPlugin.m; sourceTree = \"<group>\"; }};\\n"
pbxproj_content = re.sub(r'(/\* Begin PBXFileReference section \*/\n)', r'\g<1>' + file_ref_str, pbxproj_content)

# Add to PBXGroup
pbxproj_content = re.sub(r'(/\* WidgetSyncPlugin\.swift \*/,)', r'\g<1>\n\t\t\t\t' + fileRefId + ' /* WidgetSyncPlugin.m */,', pbxproj_content)

# Add to PBXSourcesBuildPhase
pbxproj_content = re.sub(r'(/\* WidgetSyncPlugin\.swift in Sources \*/,)', r'\g<1>\n\t\t\t\t' + buildFileId + ' /* WidgetSyncPlugin.m in Sources */,', pbxproj_content)

with open(pbxproj_path, 'w') as f:
    f.write(pbxproj_content)

print("Patched pbxproj successfully.")

