import { create_singleton } from '@providers/singleton';
import ComponentService from 'services/ComponentService';

const singleton = create_singleton(() => new ComponentService());
export default singleton;
export const component_service = singleton.instance;
