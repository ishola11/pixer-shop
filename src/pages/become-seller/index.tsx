import { BecomeSeller } from '@/components/become-seller';
import routes from '@/config/routes';
import { getStaticProps } from '@/data/become-seller';
import GeneralLayout from '@/layouts/_general-layout';
import Seo from '@/layouts/_seo';
import { NextPageWithLayout } from '@/types';
import { InferGetStaticPropsType } from 'next';
export { getStaticProps };

const BecomeSellerPage: NextPageWithLayout<
  InferGetStaticPropsType<typeof getStaticProps>
> = ({ data }) => {
  return (
    <div className="bg-[#F9FAFB] dark:bg-dark-100">
      <Seo title="Become seller" url={routes.becomeSeller} />
      <BecomeSeller data={data} />
    </div>
  );
};

// BecomeSellerPage.getLayout = getLayoutWithFooter;

BecomeSellerPage.getLayout = function getLayout(page) {
  return <GeneralLayout>{page}</GeneralLayout>;
};

export default BecomeSellerPage;
