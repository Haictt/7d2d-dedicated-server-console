export type FieldType = 'text' | 'number' | 'password' | 'select' | 'boolean';

export type ConfigField = {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: { value: string; label: string }[];
};

export type ConfigGroup = {
  title: string;
  description?: string;
  fields: ConfigField[];
};

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    title: 'Server Info',
    description: 'Basic server identity shown in the browser',
    fields: [
      { name: 'ServerName', label: 'Server Name', type: 'text' },
      { name: 'ServerDescription', label: 'Description', type: 'text' },
      { name: 'ServerPassword', label: 'Password', type: 'password', hint: 'Leave empty for no password' },
      { name: 'Region', label: 'Region', type: 'select', options: [
        { value: 'NorthAmericaEast', label: 'North America East' },
        { value: 'NorthAmericaWest', label: 'North America West' },
        { value: 'Europe', label: 'Europe' },
        { value: 'Asia', label: 'Asia' },
        { value: 'Oceania', label: 'Oceania' },
      ]},
      { name: 'Language', label: 'Language', type: 'text' },
    ],
  },
  {
    title: 'Networking',
    fields: [
      { name: 'ServerPort', label: 'Server Port', type: 'number', hint: 'Default: 26900' },
      { name: 'ServerVisibility', label: 'Visibility', type: 'select', options: [
        { value: '0', label: 'Not listed (join by IP)' },
        { value: '1', label: 'Friends only' },
        { value: '2', label: 'Public' },
      ]},
      { name: 'ServerMaxPlayerCount', label: 'Max Players', type: 'number' },
    ],
  },
  {
    title: 'World & Game',
    fields: [
      { name: 'GameWorld', label: 'World', type: 'select', options: [
        { value: 'Navezgane', label: 'Navezgane' },
        { value: 'RWG', label: 'Random World Gen' },
        { value: 'Pregen06k01', label: 'Pregen 6k 01' },
        { value: 'Pregen08k01', label: 'Pregen 8k 01' },
      ]},
      { name: 'GameName', label: 'Save Game Name', type: 'text' },
      { name: 'GameDifficulty', label: 'Difficulty (0-5)', type: 'number' },
      { name: 'DayNightLength', label: 'Day Length (minutes)', type: 'number' },
      { name: 'DayLightLength', label: 'Daylight Hours', type: 'number' },
    ],
  },
  {
    title: 'Gameplay Rules',
    fields: [
      { name: 'XPMultiplier', label: 'XP Multiplier (%)', type: 'number' },
      { name: 'BlockDamagePlayer', label: 'Player Block Damage (%)', type: 'number' },
      { name: 'BlockDamageAI', label: 'Zombie Block Damage (%)', type: 'number' },
      { name: 'DeathPenalty', label: 'Death Penalty', type: 'select', options: [
        { value: '0', label: 'Nothing' },
        { value: '1', label: 'Classic XP loss' },
        { value: '2', label: 'Injured' },
        { value: '3', label: 'Permanent death' },
      ]},
      { name: 'DropOnDeath', label: 'Drop on Death', type: 'select', options: [
        { value: '0', label: 'Nothing' },
        { value: '1', label: 'Everything' },
        { value: '2', label: 'Toolbelt only' },
        { value: '3', label: 'Backpack only' },
        { value: '4', label: 'Delete all' },
      ]},
      { name: 'BuildCreate', label: 'Creative Mode', type: 'boolean' },
    ],
  },
  {
    title: 'Admin & Telnet',
    fields: [
      { name: 'TelnetEnabled', label: 'Telnet Enabled', type: 'boolean' },
      { name: 'TelnetPort', label: 'Telnet Port', type: 'number' },
      { name: 'TelnetPassword', label: 'Telnet Password', type: 'password' },
      { name: 'EACEnabled', label: 'Easy Anti-Cheat', type: 'boolean' },
    ],
  },
];

export const SCHEMA_FIELD_NAMES = new Set(
  CONFIG_GROUPS.flatMap((g) => g.fields.map((f) => f.name))
);
