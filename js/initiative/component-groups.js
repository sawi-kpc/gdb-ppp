/* ══════════════════════════════════════════════
   Component Groups Config
   Edit this file to add/rename groups or components.
   - id:       group key (used internally)
   - label:    display label in dropdown
   - children: component values that belong to this group
               (leave empty [] for a standalone item)
══════════════════════════════════════════════ */
var GDB_COMPONENT_GROUPS = [
  {
    id: 'th',
    label: 'TH',
    children: [
      'kingpower-commerce-th'
    ]
  },
  {
    id: 'cn',
    label: 'CN',
    children: [
      'kingpower-commerce-cn',
      'taihaitao-commerce-cn',
      'jd-phamacy-marketplace-cn',
      'kingpower-douyin-social-commerce',
      'jd-marketplace-cn'
    ]
  },
  {
    id: 'f1',
    label: 'F1',
    children: [
      'firster-commerce',
      'firster-tiktok-social-commerce'
    ]
  },
  { id: 'creator-hub',         label: 'creator-hub',         children: [] },
  { id: 'new-or-undefined',    label: 'new-or-undefined',    children: [] },
  { id: 'manual-operations',   label: 'manual-operations',   children: [] },
  { id: '(missing component)', label: '(missing component)', children: [] }
];
