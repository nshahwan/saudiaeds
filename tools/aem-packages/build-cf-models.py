"""Build the Saudia Content Fragment Models as an AEM content package.

Output: tools/aem-packages/saudiaeds-cf-models/ (FileVault source tree) and
        tools/aem-packages/dist/saudiaeds-cf-models-<version>.zip (install via Package Manager)

Models live under /conf/saudiaeds/settings/dam/cfm/models; the package also points the DAM
folder /content/dam/saudiaeds at /conf/saudiaeds (cq:conf, merged — nothing else in the DAM is
touched) so the models are offered when authors create fragments there.

The models describe the structured content of the migrated page types: destination landings and
their FAQ items, the booking engine, and the stories of a stories list (the press release /
quote models were withdrawn with the press release pages).

The package also carries the booking engine Content Fragments, one per page that shows the
booking engine, built from tools/aem-packages/booking-engine-fragments.json (extracted from the
migrated pages): /content/dam/saudiaeds/fragments/booking-engine/<page> and the links they
reference, /content/dam/saudiaeds/fragments/booking-links/<name>.
usage: python3 tools/aem-packages/build-cf-models.py
"""
import json
import os
import shutil
import zipfile
from xml.sax.saxutils import quoteattr

HERE = os.path.dirname(os.path.abspath(__file__))
NAME, GROUP, VERSION = 'saudiaeds-cf-models', 'saudiaeds', '1.3.0'
CONF = '/conf/saudiaeds'
MODELS = f'{CONF}/settings/dam/cfm/models'
DAM = '/content/dam/saudiaeds'
SITE = '/content/saudiaeds'
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


def page(name, label, required=False, desc=None):
    """a reference to a site page (content path, no asset validation)"""
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'dam/cfm/models/editor/components/contentreference',
                   'metaType': 'reference', 'valueType': 'string', 'rootPath': SITE,
                   'showThumbnail': 'false'})


def fragments(name, label, model, desc=None):
    return dict(name=name, fieldLabel=label, required=False, fieldDescription=desc,
                **{'sling:resourceType': 'dam/cfm/models/editor/components/fragmentreference',
                   'metaType': 'fragment-reference', 'valueType': 'string/content-fragment[]',
                   'fragmentmodelreference': f'[{MODELS}/{model}]', 'rootPath': DAM,
                   'allowNew': 'true'})


def fragment(name, label, model, required=False, desc=None):
    f = fragments(name, label, model, desc)
    f.update(required=required, valueType='string/content-fragment')
    return f


def texts(name, label, required=False, desc=None, maxlength=255):
    """a multi-value single-line text field (Render as: multiple field)"""
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                _child={'sling:resourceType': 'granite/ui/components/coral/foundation/form/textfield',
                        'maxlength': str(maxlength), 'name': name, 'renderReadOnly': 'false'},
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/multifield',
                   'metaType': 'text-single', 'valueType': 'string[]'})


def boolean(name, label, desc=None, checked=False):
    return dict(name=name, fieldLabel=label, required=False, fieldDescription=desc, text=label,
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/checkbox',
                   'metaType': 'boolean', 'valueType': 'boolean', 'checked': str(checked).lower()})


def enumeration(name, label, options, required=False, desc=None):
    return dict(name=name, fieldLabel=label, required=required, fieldDescription=desc,
                **{'sling:resourceType': 'granite/ui/components/coral/foundation/form/select',
                   'metaType': 'enumeration', 'valueType': 'string',
                   'options': '[' + ','.join(options) + ']', 'emptyOption': 'true'})


MODEL_DEFS = {
    'faq-item': ('FAQ Item', 'One question and its answer (destination and help pages).', [
        text('question', 'Question', True),
        richtext('answer', 'Answer', True),
    ]),
    'booking-link': ('Booking Link', 'A link shown by the booking engine (promo or quick link, notice link).', [
        text('label', 'Label', True, desc='e.g. "Flight + Hotel".'),
        text('url', 'URL', True, maxlength=2000),
        boolean('external', 'Opens an external site', 'Shows the external-link icon and opens in a new tab.'),
    ]),
    'booking-engine': ('Booking Engine', 'The flight booking widget: tabs, trip types, route fields and notice.', [
        text('title', 'Title', True, desc='Internal name, e.g. "Booking engine — Home".'),
        texts('tabs', 'Tabs', True, 'One per tab, in order; the first is selected.'),
        texts('tripTypes', 'Trip types', True, 'One per option, in order; the first is selected.'),
        text('milesLabel', 'Miles toggle label', desc='e.g. "Book with Miles".'),
        text('fromLabel', 'From label', True),
        text('defaultOrigin', 'Default origin', desc='e.g. "Jeddah (JED)".'),
        text('toLabel', 'To label', True),
        text('swapLabel', 'Swap button label', desc='Accessible name of the swap button.'),
        text('infoMessage', 'Notice message', maxlength=500),
        fragment('infoLink', 'Notice link', 'booking-link'),
        fragments('links', 'Promo and quick links', 'booking-link',
                  'One link shows as a promo at the top right; several show as quick links.'),
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
    'story': ('Story', 'One story in a stories list (home "Exceptional experiences with Saudia").', [
        text('title', 'Title', True, desc='e.g. "Saudia Named “Best Airline Staff Service” at the 2025 Skytrax Awards".'),
        text('summary', 'Summary', desc='One or two sentences under the title.', maxlength=500),
        asset('image', 'Image (desktop)'),
        asset('imageMobile', 'Image (mobile)', desc='Optional; the desktop image is used when empty.'),
        text('imageAlt', 'Image alt text', maxlength=500),
        page('pressRelease', 'Press release',
             desc='Optional: the press release page the story is about; the story links to it.'),
        text('link', 'Link', desc='Where the story links to when no press release is picked '
             '(a page path or a full URL).', maxlength=2000),
        text('linkText', 'Link text', desc='Defaults to "Learn more".'),
    ]),
}


def attrs(d):
    return '\n'.join(f'    {k}={quoteattr(v)}' for k, v in d.items() if v is not None)


def field_xml(i, f):
    props = {'jcr:primaryType': 'nt:unstructured', 'listOrder': str(i), 'renderReadOnly': 'false',
             'showEmptyInReadOnly': 'true'}
    child = f.get('_child')
    for k, v in f.items():
        if k == '_child':
            continue
        if k == 'required':
            if v:
                props['required'] = 'on'
        else:
            props[k] = v
    body = '\n'.join(f'                            {k}={quoteattr(v)}' for k, v in props.items() if v is not None)
    if child:
        cbody = '\n'.join(f'                                {k}={quoteattr(v)}' for k, v in
                          {'jcr:primaryType': 'nt:unstructured', **child}.items())
        return (f'                        <{f["name"]}\n{body}>\n                            <field\n{cbody}/>\n'
                f'                        </{f["name"]}>')
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


# ---- booking engine content fragments ----
FRAGMENTS = f'{DAM}/fragments'
BOOKING = json.load(open(os.path.join(HERE, 'booking-engine-fragments.json'), encoding='utf-8'))


def jcr_value(v):
    """FileVault docview value: typed booleans, escaped multi-value arrays"""
    if isinstance(v, bool):
        return '{Boolean}' + str(v).lower()
    if isinstance(v, list):
        return '[' + ','.join(x.replace('\\', '\\\\').replace(',', '\\,') for x in v) + ']'
    return v.replace('\\', '\\\\') if v.startswith('{') else v


def fragment_xml(model, name, parent, title, values):
    master = '\n'.join(f'                {k}={quoteattr(jcr_value(v))}' for k, v in values.items())
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="dam:Asset">
    <jcr:content
        cq:name={quoteattr(name)}
        cq:parentPath={quoteattr(parent)}
        contentFragment="{{Boolean}}true"
        jcr:primaryType="dam:AssetContent"
        jcr:title={quoteattr(title)}>
        <data
            cq:model="{MODELS}/{model}"
            jcr:primaryType="nt:unstructured">
            <master
                jcr:primaryType="nt:unstructured"
{master}/>
        </data>
        <metadata jcr:primaryType="nt:unstructured"/>
        <related jcr:primaryType="nt:unstructured"/>
    </jcr:content>
</jcr:root>
"""


def folder_xml(title):
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n<jcr:root {NS}\n    jcr:primaryType="sling:OrderedFolder">\n'
            f'    <jcr:content\n        jcr:primaryType="nt:unstructured"\n        jcr:title={quoteattr(title)}/>\n</jcr:root>\n')


fragment_files = {
    f'jcr_root{FRAGMENTS}/.content.xml': folder_xml('Content Fragments'),
    f'jcr_root{FRAGMENTS}/booking-engine/.content.xml': folder_xml('Booking engine'),
    f'jcr_root{FRAGMENTS}/booking-links/.content.xml': folder_xml('Booking links'),
    # authors' Story fragments live here (the stories block's fragment picker opens it)
    f'jcr_root{FRAGMENTS}/stories/.content.xml': folder_xml('Stories'),
}
for key, link in BOOKING['links'].items():
    fragment_files[f'jcr_root{FRAGMENTS}/booking-links/{key}/.content.xml'] = fragment_xml(
        'booking-link', key, f'{FRAGMENTS}/booking-links', link['label'],
        {'label': link['label'], 'url': link['url'], 'external': link['external']})
for e in BOOKING['engines']:
    values = {k: e[k] for k in ('title', 'tabs', 'tripTypes', 'milesLabel', 'fromLabel', 'defaultOrigin',
                                'toLabel', 'swapLabel', 'infoMessage')}
    values['infoLink'] = f"{FRAGMENTS}/booking-links/{e['infoLink']}"
    if e['links']:
        values['links'] = [f'{FRAGMENTS}/booking-links/{k}' for k in e['links']]
    fragment_files[f"jcr_root{FRAGMENTS}/booking-engine/{e['name']}/.content.xml"] = fragment_xml(
        'booking-engine', e['name'], f'{FRAGMENTS}/booking-engine', e['title'], values)

root = os.path.join(HERE, NAME)
if os.path.isdir(root):
    shutil.rmtree(root)
files = {
    'META-INF/vault/filter.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n'
    + ''.join(f'    <filter root="{MODELS}/{m}"/>\n' for m in MODEL_DEFS)
    + f'    <filter root="{DAM}/jcr:content" mode="merge_properties"/>\n'
    + f'    <filter root="{DAM}/fragments/booking-engine"/>\n'
    + f'    <filter root="{DAM}/fragments/booking-links"/>\n'
    # merge: creates the folder, never touches the Story fragments authors put in it
    + f'    <filter root="{DAM}/fragments/stories" mode="merge"/>\n</workspaceFilter>\n',
    'META-INF/vault/properties.xml': f'''<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">{NAME}</entry>
<entry key="group">{GROUP}</entry>
<entry key="version">{VERSION}</entry>
<entry key="description">Saudia Content Fragment Models (destination, FAQ item, booking engine, booking link, story), the booking engine Content Fragments and the cq:conf of {DAM}.</entry>
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
files.update(fragment_files)

for rel, text_ in files.items():
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text_)

os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
zpath = os.path.join(HERE, 'dist', f'{NAME}-{VERSION}.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(files):
        z.write(os.path.join(root, rel), rel)
print(zpath, len(files), 'files;', ', '.join(f'{m} ({len(f[2])} fields)' for m, f in MODEL_DEFS.items()),
      f"; fragments: {len(BOOKING['engines'])} booking engines, {len(BOOKING['links'])} links")
