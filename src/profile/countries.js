(function (root) {
  'use strict';

  const countries = [['AU', 'Australia', '+61'], ['AT', 'Austria', '+43'], ['BE', 'Belgium', '+32'], ['BR', 'Brazil', '+55'], ['BG', 'Bulgaria', '+359'], ['CA', 'Canada', '+1'], ['CN', 'China', '+86'], ['HR', 'Croatia', '+385'], ['CY', 'Cyprus', '+357'], ['CZ', 'Czechia', '+420'], ['DK', 'Denmark', '+45'], ['EE', 'Estonia', '+372'], ['FI', 'Finland', '+358'], ['FR', 'France', '+33'], ['DE', 'Germany', '+49'], ['GR', 'Greece', '+30'], ['HK', 'Hong Kong', '+852'], ['HU', 'Hungary', '+36'], ['IN', 'India', '+91'], ['ID', 'Indonesia', '+62'], ['IE', 'Ireland', '+353'], ['IL', 'Israel', '+972'], ['IT', 'Italy', '+39'], ['JP', 'Japan', '+81'], ['LV', 'Latvia', '+371'], ['LT', 'Lithuania', '+370'], ['LU', 'Luxembourg', '+352'], ['MY', 'Malaysia', '+60'], ['MT', 'Malta', '+356'], ['MX', 'Mexico', '+52'], ['NL', 'Netherlands', '+31'], ['NZ', 'New Zealand', '+64'], ['NO', 'Norway', '+47'], ['PH', 'Philippines', '+63'], ['PL', 'Poland', '+48'], ['PT', 'Portugal', '+351'], ['RO', 'Romania', '+40'], ['SA', 'Saudi Arabia', '+966'], ['SG', 'Singapore', '+65'], ['SK', 'Slovakia', '+421'], ['SI', 'Slovenia', '+386'], ['ZA', 'South Africa', '+27'], ['KR', 'South Korea', '+82'], ['ES', 'Spain', '+34'], ['SE', 'Sweden', '+46'], ['CH', 'Switzerland', '+41'], ['TW', 'Taiwan', '+886'], ['TR', 'Türkiye', '+90'], ['UA', 'Ukraine', '+380'], ['AE', 'United Arab Emirates', '+971'], ['GB', 'United Kingdom', '+44'], ['US', 'United States', '+1'], ['VN', 'Vietnam', '+84']].map(([iso, name, callingCode]) => ({
    iso,
    name,
    callingCode
  }));
  root.OpenApplyCountries = countries;
  if (typeof module !== 'undefined') module.exports = countries;
})(globalThis);
