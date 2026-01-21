import { Header, Footer } from "@/components/Layout";
import { PixelButton, PixelCard } from "@/components/PixelUI";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Upload, ArrowRight, MousePointer2, Download, Palette, FileImage } from "lucide-react";
import heroImg from "@/assets/hero_beads_art.jpg"; // We will check if this exists or use placeholder

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-body bg-background text-foreground bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <Header />

      <main className="flex-1 container mx-auto p-4 md:p-8 space-y-12">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-8">
          <div className="space-y-6">
            <div className="inline-block bg-accent text-accent-foreground px-4 py-2 font-display text-xl border-2 border-black shadow-pixel-sm transform -rotate-2">
              ✨ 免费且开源
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-none">
              将图片一键转为<span className="text-primary underline decoration-wavy decoration-4">拼豆图纸</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
              上传任意照片，自动转换为完美的像素图纸，并生成详细的拼豆购物清单。
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/editor">
                <PixelButton size="lg" className="text-xl">
                  开始制作 <ArrowRight className="ml-2 h-6 w-6" />
                </PixelButton>
              </Link>
              <Link href="/blueprint">
                <PixelButton variant="outline" size="lg" className="text-xl">
                  图纸编辑
                </PixelButton>
              </Link>
            </div>
          </div>
          
          <div className="relative">
             {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-secondary border-4 border-black z-0"></div>
            <div className="absolute -bottom-6 -left-6 w-full h-full bg-primary/20 border-4 border-black z-0"></div>
            
            <PixelCard className="relative z-10 p-0 overflow-hidden bg-white rotate-1 hover:rotate-0 transition-transform duration-300">
               {/* Use the generated hero image if available, else fallback */}
               <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center overflow-hidden">
                 <img 
                   src={heroImg} 
                   alt="Bead Art Example" 
                   className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                   onError={(e) => {
                     e.currentTarget.src = "https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2070&auto=format&fit=crop";
                   }}
                 />
               </div>
               <div className="p-4 border-t-4 border-black bg-white flex justify-between items-center">
                 <span className="font-display text-xl">project_01.png</span>
                 <div className="flex gap-2">
                   <div className="w-4 h-4 bg-red-500 border-2 border-black"></div>
                   <div className="w-4 h-4 bg-blue-500 border-2 border-black"></div>
                   <div className="w-4 h-4 bg-yellow-500 border-2 border-black"></div>
                 </div>
               </div>
            </PixelCard>
          </div>
        </section>

        {/* Feature Steps */}
        <section className="py-12 border-t-4 border-dashed border-black/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Upload size={32} />}
              title="1. 上传图片"
              description="拖拽或点击上传。支持 JPG, PNG, WebP 格式。"
              color="bg-secondary"
            />
            <FeatureCard 
              icon={<Palette size={32} />}
              title="2. 调整参数"
              description="调整尺寸，选择色卡品牌 (Perler/Hama等)，开启抖动优化。"
              color="bg-primary"
            />
            <FeatureCard 
              icon={<Download size={32} />}
              title="3. 导出制作"
              description="下载可打印的 PDF 图纸和颜色用量清单。"
              color="bg-accent"
            />
          </div>
        </section>
        
        {/* Workspace Placeholder (For next task) */}
        <section id="workspace" className="min-h-[500px] flex flex-col items-center justify-center border-4 border-black border-dashed bg-white/50 p-8 rounded-lg">
           <div className="text-center space-y-4 max-w-md">
             <div className="mx-auto w-20 h-20 bg-muted border-4 border-black flex items-center justify-center rounded-full">
               <MousePointer2 size={40} className="text-muted-foreground" />
             </div>
             <h3 className="text-3xl font-display font-bold">工作区预览</h3>
             <p className="text-muted-foreground">
               此处为编辑器工作区，您可以在下一步中体验完整功能。
             </p>
             <PixelButton>初始化工作区</PixelButton>
           </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <div className="group relative">
      <div className={cn("absolute inset-0 border-4 border-black translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3", color)}></div>
      <div className="relative border-4 border-black bg-white p-6 h-full transition-transform group-hover:-translate-y-1 group-hover:-translate-x-1">
        <div className="mb-4 inline-block p-3 border-2 border-black bg-muted rounded-none">
          {icon}
        </div>
        <h3 className="text-2xl font-display font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
