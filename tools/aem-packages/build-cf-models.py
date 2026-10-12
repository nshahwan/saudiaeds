"""Build the Saudia Content Fragment Models as an AEM content package.

Output: tools/aem-packages/saudiaeds-cf-models/ (FileVault source tree) and
        tools/aem-packages/dist/saudiaeds-cf-models-<version>.zip (install via Package Manager)

Models live under /conf/saudiaeds/settings/dam/cfm/models; the package also points the DAM
folder /content/dam/saudiaeds at /conf/saudiaeds (cq:conf, merged — nothing else in the DAM is
touched) so the models are offered when authors create fragments there.

The models describe the structured content of the migrated page types: press releases (both
layouts), their pull quotes, destination landings and their FAQ items.
usage: python3 tools/aem-packages/build-cf-models.py
"""
import os
import shutil
import zipfile
from xml.sax.saxutils import quoteattr

HERE = os.path.dirname(os.path.abspath(__file__))
NAME, GROUP, VERSION = 'saudiaeds-cf-models', 'saudiaeds', '1.0.0'
CONF = '/conf/saudiaeds'
MODELS = f'{CONF}/settings/dam/cfm/models'
DAM = '/content/dam/saudiaeds'
NS = ('xmlns:sling="http://sling.apache.org/jcr/sling/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" '
      'xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"')


# ---- field types (Content Fragment Model editor data types) ----
def text(name, label, required=False, desc=None, maxlength=255):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/textfield',
                   'metaType': 'text-single', 'valueType': 'string', 'maxlength': str(maxlength)})


def richtext(name, label, required=False, desc=None):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'dam/cfm/admin/components/authoring/contenteditor/multieditor',
                   'metaType': 'text-multi', 'valueType': 'string', 'default-mime-type': 'text/html',
                   'cfm-element': 'true'})


def date(name, label, required=False, desc=None):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/datepicker',
                   'metaType': 'date', 'valueType': 'calendar/date', 'type': 'date',
                   'displayedFormat': 'YYYY-MM-DD'})


def asset(name, label, required=False, desc=None):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'dam/cfm/models/editor/components/contentreference',
                   'metaType': 'reference', 'valueType': 'string', 'rootPath': DAM,
                   'showThumbnail': 'true', 'validation': 'cfm.validation.contenttype.image'})


def fragments(name, label, model, desc=None):
    return dict(name=name, fieldLabel=label, required=False, fieldDescription=desc,
                **{'sling:resourceType': 'dam/cfm/models/editor/components/fragmentreference',
                   'metaType': 'fragment-reference', 'valueType': 'string/content-fragment[]',
                   'fragmentmodelreference': f'[{MODELS}/{model}]', 'rootPath': DAM,
                   'allowNew': 'true'})


def enumeration(name, label, options, required=False, desc=None):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/select',
                   'metaType': 'enumeration', 'valueType': 'string',
                   'options': '[' + ','.join(options) + ']', 'emptyOption': 'true'})


MODEL_DEFS = {
    'quote': ('Quote', 'A pull quote with its speaker line (press release body).', [
        richtext('quotation', 'Quotation', True),
        text('attribution', 'Attribution', desc='Speaker name and role, e.g. "H.E. Engr. Ibrahim Al-Omar, Director General of Saudia Group".'),
    ]),
    'faq-item': ('FAQ Item', 'One question and its answer (destination and help pages).', [
        text('question', 'Question', True),
        richtext('answer', 'Answer', True),
    ]),
    'press-release': ('Press Release', 'A Saudia press release (About us › press releases).', [
        text('title', 'Title', True),
        text('subtitle', 'Subtitle'),
        text('location', 'Location', desc='Dateline city, e.g. "Jeddah".'),
        date('date', 'Release date'),
        enumeration('layout', 'Layout', ['article', 'legacy'],
                    desc='article: split lead (meta line, title, subtitle beside the image); legacy: campaign banner above the title.'),
        asset('heroImage', 'Lead image'),
        asset('heroImageMobile', 'Lead image (mobile)', desc='Optional mobile rendition of the lead or banner image.'),
        text('heroImageAlt', 'Lead image alt text', maxlength=500),
        richtext('body', 'Body', True),
        fragments('quotes', 'Quotes', 'quote', 'Pull quotes shown in the body, in order.'),
    ]),
    'destination': ('Destination', 'A destination landing (Explore › Fly to …).', [
        text('name', 'Destination name', True, desc='e.g. "Athens".'),
        text('heading', 'Hero heading', desc='e.g. "Your Summer in Athens".'),
        asset('heroImage', 'Hero image'),
        asset('heroImageMobile', 'Hero image (mobile)'),
        text('heroImageAlt', 'Hero image alt text', maxlength=500),
        richtext('intro', 'Introduction'),
        richtext('itinerary', 'Itinerary'),
        fragments('faqs', 'FAQs', 'faq-item', 'Questions shown in the FAQ section, in order.'),
    ]),
}


def attrs(d):
    return '\n'.join(f'    {k}={quoteattr(v)}' for k, v in d.items() if v is not None)


def field_xml(i, f):
    props = {'jcr:primaryType': 'nt:unstructured', 'listOrder': str(i), 'renderReadOnly': 'false',
             'showEmptyInReadOnly': 'true'}
    for k, v in f.items():
        if k == 'required':
            if v:
                props['required'] = 'on'
        else:
            props[k] = v
    body = '\n'.join(f'                            {k}={quoteattr(v)}' for k, v in props.items() if v is not None)
    return f'                        <{f["name"]}\n{body}/>'


def model_xml(model, title, desc, fields):
    items = '\n'.join(field_xml(i + 1, f) for i, f in enumerate(fields))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="cq:Template"
    allowedPaths="[^{DAM}(/.*)?]"
    ranking="{{Long}}100">
    <jcr:content
        cq:scaffolding="{MODELS}/{model}/jcr:content/model"
        cq:templateType="/libs/settings/dam/cfm/model-types/fragment"
        jcr:description={quoteattr(desc)}
        jcr:primaryType="cq:PageContent"
        jcr:title={quoteattr(title)}
        sling:resourceSuperType="dam/cfm/models/console/components/data/entity"
        sling:resourceType="dam/cfm/models/console/components/data/entity/default"
        status="enabled">
        <model
            cq:targetPath="/content/entities"
            dataTypesConfig="/mnt/overlay/settings/dam/cfm/models/formbuilderconfig/datatypes"
            jcr:primaryType="cq:PageContent"
            maxGeneratedOrder="20"
            sling:resourceType="wcm/scaffolding/components/scaffolding">
            <cq:dialog
                jcr:primaryType="nt:unstructured"
                sling:resourceType="cq/gui/components/authoring/dialog">
                <content
                    jcr:primaryType="nt:unstructured"
                    sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns">
                    <items
                        jcr:primaryType="nt:unstructured"
                        maxGeneratedOrder="20">
{items}
                    </items>
                </content>
            </cq:dialog>
        </model>
    </jcr:content>
</jcr:root>
'''


def simple(primary, extra=''):
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<jcr:root {NS}\n    jcr:primaryType="{primary}"{extra}/>\n'


root = os.path.join(HERE, NAME)
if os.path.isdir(root):
    shutil.rmtree(root)
files = {
    'META-INF/vault/filter.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n'
    + ''.join(f'    <filter root="{MODELS}/{m}"/>\n' for m in MODEL_DEFS)
    + f'    <filter root="{DAM}/jcr:content" mode="merge_properties"/>\n</workspaceFilter>\n',
    'META-INF/vault/properties.xml': f'''<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">{NAME}</entry>
<entry key="group">{GROUP}</entry>
<entry key="version">{VERSION}</entry>
<entry key="description">Saudia Content Fragment Models (press release, quote, destination, FAQ item) and the cq:conf of {DAM}.</entry>
<entry key="packageType">content</entry>
<entry key="requiresRoot">false</entry>
<entry key="allowIndexDefinitions">false</entry>
</properties>
''',
    'jcr_root/conf/saudiaeds/.content.xml': simple('sling:Folder', '\n    jcr:title="Saudia EDS"'),
    'jcr_root/conf/saudiaeds/settings/.content.xml': simple('sling:Folder'),
    'jcr_root/conf/saudiaeds/settings/dam/.content.xml': simple('cq:Page'),
    'jcr_root/conf/saudiaeds/settings/dam/cfm/.content.xml': simple('cq:Page'),
    'jcr_root/conf/saudiaeds/settings/dam/cfm/models/.content.xml': simple('cq:Page'),
    'jcr_root/content/dam/saudiaeds/.content.xml': f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="sling:OrderedFolder">
    <jcr:content
        cq:conf="{CONF}"
        jcr:primaryType="nt:unstructured"
        jcr:title="Saudia EDS"/>
</jcr:root>
''',
}
for m, (title, desc, fields) in MODEL_DEFS.items():
    files[f'jcr_root{MODELS}/{m}/.content.xml'] = model_xml(m, title, desc, fields)

for rel, text_ in files.items():
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text_)

os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
zpath = os.path.join(HERE, 'dist', f'{NAME}-{VERSION}.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(files):
        z.write(os.path.join(root, rel), rel)
print(zpath, len(files), 'files;', ', '.join(f'{m} ({len(f[2])} fields)' for m, f in MODEL_DEFS.items()))
