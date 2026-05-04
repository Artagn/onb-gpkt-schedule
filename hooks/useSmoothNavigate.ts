import { useNavigate as useRouterNavigate, NavigateOptions, To } from 'react-router-dom';
import { flushSync } from 'react-dom';

export const useSmoothNavigate = () => {
    const navigate = useRouterNavigate();

    return (to: To, options?: NavigateOptions) => {
        // Check browser support (Chrome 111+, Edge)
        // @ts-ignore
        if (!document.startViewTransition) {
            navigate(to, options);
            return;
        }

        // @ts-ignore
        document.startViewTransition(() => {
            // flushSync forces React to update DOM synchronously inside the transition
            flushSync(() => {
                navigate(to, options);
            });
        });
    };
};
