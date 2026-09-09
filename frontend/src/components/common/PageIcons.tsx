import type { SvgIconProps } from '@mui/material/SvgIcon';
import GoogleIcon from './GoogleIcon';

const iconSizes = {
  inherit: 'inherit',
  small: 20,
  medium: 24,
  large: 35,
} as const;

const createPageIcon = (name: string) => {
  const PageIcon = ({ fontSize = 'medium', color, htmlColor, sx }: SvgIconProps) => (
    <GoogleIcon
      name={name}
      size={iconSizes[fontSize]}
      sx={{
        color: htmlColor ?? (color && color !== 'inherit' ? `${color}.main` : color),
        ...sx,
      }}
    />
  );

  PageIcon.displayName = `${name}Icon`;
  return PageIcon;
};

export const Search = createPageIcon('search');
export const FilterList = createPageIcon('filter_list');
export const Download = createPageIcon('download');
export const Refresh = createPageIcon('refresh');
export const Clear = createPageIcon('clear');
export const Add = createPageIcon('add');
export const Edit = createPageIcon('edit');
export const Delete = createPageIcon('delete');
export const Visibility = createPageIcon('visibility');
export const LockReset = createPageIcon('lock_reset');
export const CheckCircle = createPageIcon('check_circle');
export const Cancel = createPageIcon('cancel');
export const SearchIcon = Search;
export const CloudUpload = createPageIcon('cloud_upload');
export const Person = createPageIcon('person');
export const LocationOn = createPageIcon('location_on');
export const Phone = createPageIcon('phone');
export const Email = createPageIcon('email');
export const Assignment = createPageIcon('assignment');
export const Pending = createPageIcon('pending');
export const Dashboard = createPageIcon('dashboard');
export const ListAlt = createPageIcon('list_alt');
export const People = createPageIcon('people');
export const Settings = createPageIcon('settings');
export const Menu = createPageIcon('menu');
export const Close = createPageIcon('close');
export const Business = createPageIcon('business');
export const Groups = createPageIcon('groups');
export const Female = createPageIcon('female');
export const Male = createPageIcon('male');
export const Agriculture = createPageIcon('agriculture');
export const ChildCare = createPageIcon('child_care');
export const EventNote = createPageIcon('event_note');
export const School = createPageIcon('school');
export const LocalShipping = createPageIcon('local_shipping');
export const Group = createPageIcon('group');
export const Warning = createPageIcon('warning');
export const Schedule = createPageIcon('schedule');
export const AttachMoney = createPageIcon('attach_money');
export const CalendarToday = createPageIcon('calendar_today');
export const TableChart = createPageIcon('table_chart');
export const InsertDriveFile = createPageIcon('insert_drive_file');
export const ReportProblem = createPageIcon('report_problem');
export const VerifiedUser = createPageIcon('verified_user');
export const Sync = createPageIcon('sync');
export const Pets = createPageIcon('pets');
export const FamilyRestroom = createPageIcon('family_restroom');
export const PictureAsPdf = createPageIcon('picture_as_pdf');
export const TrendingUp = createPageIcon('trending_up');
export const Info = createPageIcon('info');
export const History = createPageIcon('history');
export const Calculate = createPageIcon('calculate');
export const ShowChart = createPageIcon('show_chart');
export const Assessment = createPageIcon('assessment');
export const Description = createPageIcon('description');