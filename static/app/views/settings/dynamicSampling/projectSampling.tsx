import {useMemo, useState} from 'react';
import styled from '@emotion/styled';

import {addLoadingMessage, addSuccessMessage} from 'sentry/actionCreators/indicator';
import {Button} from 'sentry/components/button';
import Panel from 'sentry/components/panels/panel';
import PanelBody from 'sentry/components/panels/panelBody';
import PanelHeader from 'sentry/components/panels/panelHeader';
import {SegmentedControl} from 'sentry/components/segmentedControl';
import {Tooltip} from 'sentry/components/tooltip';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import {ProjectsEditTable} from 'sentry/views/settings/dynamicSampling/projectsEditTable';
import {SamplingModeField} from 'sentry/views/settings/dynamicSampling/samplingModeField';
import {projectSamplingForm} from 'sentry/views/settings/dynamicSampling/utils/projectSamplingForm';
import type {ProjectionSamplePeriod} from 'sentry/views/settings/dynamicSampling/utils/useProjectSampleCounts';
import {
  useGetSamplingProjectRates,
  useUpdateSamplingProjectRates,
} from 'sentry/views/settings/dynamicSampling/utils/useSamplingProjectRates';
import {useAccess} from 'sentry/views/settings/projectMetrics/access';

const {useFormState, FormProvider} = projectSamplingForm;

export function ProjectSampling() {
  const {hasAccess} = useAccess({access: ['org:write']});
  const [period, setPeriod] = useState<ProjectionSamplePeriod>('24h');
  const {data, isPending} = useGetSamplingProjectRates();

  const updateSamplingProjectRates = useUpdateSamplingProjectRates();

  const projectRates = useMemo(
    () =>
      (data || []).reduce(
        (acc, item) => {
          acc[item.id.toString()] = (item.sampleRate * 100).toString();
          return acc;
        },
        {} as Record<string, string>
      ),
    [data]
  );

  const initialValues = useMemo(() => ({projectRates}), [projectRates]);

  const formState = useFormState({
    initialValues: initialValues,
    enableReInitialize: true,
  });

  const handleSubmit = () => {
    const ratesArray = Object.entries(formState.fields.projectRates.value).map(
      ([id, rate]) => ({
        id: Number(id),
        sampleRate: Number(rate) / 100,
      })
    );
    addLoadingMessage(t('Saving changes...'));
    updateSamplingProjectRates.mutate(ratesArray, {
      onSuccess: () => {
        formState.save();
        addSuccessMessage(t('Changes applied'));
      },
      onError: () => {
        addLoadingMessage(t('Unable to save changes. Please try again.'));
      },
    });
  };

  const isFormActionDisabled =
    !hasAccess ||
    isPending ||
    updateSamplingProjectRates.isPending ||
    !formState.hasChanged;

  return (
    <FormProvider formState={formState}>
      <form onSubmit={event => event.preventDefault()}>
        <Panel>
          <PanelHeader>{t('Manual Sampling')}</PanelHeader>
          <PanelBody>
            <SamplingModeField />
          </PanelBody>
        </Panel>
        <HeadingRow>
          <h4>{t('Customize Projects')}</h4>
          <Tooltip
            title={t(
              'The time period for which the projected sample rates are calculated.'
            )}
          >
            <SegmentedControl
              label={t('Stats period')}
              value={period}
              onChange={setPeriod}
              size="xs"
            >
              <SegmentedControl.Item key="24h">{t('24h')}</SegmentedControl.Item>
              <SegmentedControl.Item key="30d">{t('30d')}</SegmentedControl.Item>
            </SegmentedControl>
          </Tooltip>
        </HeadingRow>
        <p>{t('Set custom rates for traces starting at each of your projects.')}</p>
        <ProjectsEditTable isLoading={isPending} period={period} />
        <FormActions>
          <Button disabled={isFormActionDisabled} onClick={formState.reset}>
            {t('Reset')}
          </Button>
          <Button
            priority="primary"
            disabled={isFormActionDisabled}
            onClick={handleSubmit}
          >
            {t('Apply Changes')}
          </Button>
        </FormActions>
      </form>
    </FormProvider>
  );
}

const FormActions = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: ${space(1)};
  justify-content: flex-end;
  padding-bottom: ${space(4)};
`;

const HeadingRow = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: ${space(3)};
  padding-bottom: ${space(1.5)};

  & > * {
    margin: 0;
  }
`;
