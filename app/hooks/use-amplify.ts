import { Amplify } from "aws-amplify";
import amplifyConfig from '../utils/amplify-config';

export default function useAmplify() {
    Amplify.configure(amplifyConfig, {ssr: true});
}
